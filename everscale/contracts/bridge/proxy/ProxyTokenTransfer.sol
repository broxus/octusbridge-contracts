pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../utils/ErrorCodes.sol";
import "./../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import "./../../utils/TransferUtils.sol";

import "./../interfaces/IProxy.sol";
import "./../interfaces/IProxyTokenTransferConfigurable.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";
import "./../interfaces/legacy/ILegacyBurnTokensCallback.sol";
import "./../interfaces/legacy/ILegacyTransferOwner.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITransferableOwnership.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

/// @title Proxy for cross chain token transfers
/// @dev In case of ETH-Everscale token transfer, this proxy should receive
/// `onEventConfirmed` callback from the corresponding EthereumEventConfiguration. Then it mints
/// the specified amount of tokens to the user.
/// In case of Everscale-ETH token transfer, this proxy should receive burn callback from the token
/// and deploy event. This event will be signed by relays so it can be sent to the corresponding EVM Vault.
contract ProxyTokenTransfer is
    IProxy,
    IProxyTokenTransferConfigurable,
    IAcceptTokensBurnCallback,
    RandomNonce,
    ProxyTokenTransferCellEncoder,
    InternalOwner,
    TransferUtils,
    CheckPubKey
{
    event Withdraw(int8 wid, uint256 addr, uint128 tokens, uint160 eth_addr, uint32 chainId);

    Configuration config;
    uint128 burnedCount;
    bool paused = false;

    modifier onlyEthereumConfiguration() {
        require(isArrayContainsAddress(config.ethereumConfigurations, msg.sender), ErrorCodes.NOT_ETHEREUM_CONFIG);
        _;
    }

    constructor(address owner_) public checkPubKey {
        tvm.accept();

        setOwnership(owner_);
    }

    function onEventConfirmed(
        IEthereumEvent.EthereumEventInitData eventData,
        address gasBackAddress
    ) public override onlyEthereumConfiguration reserveAtLeastTargetBalance {
        require(!paused, ErrorCodes.PROXY_PAUSED);
        require(config.tokenRoot.value != 0, ErrorCodes.PROXY_TOKEN_ROOT_IS_EMPTY);

        (
            uint128 tokens,
            int8 wid,
            uint256 owner_addr
        ) = decodeEthereumEventData(eventData.voteData.eventData);

        address owner_address = address.makeAddrStd(wid, owner_addr);

        require(tokens > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require(owner_address.value != 0, ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        TvmCell empty;

        ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            tokens,
            owner_address,
            config.settingsDeployWalletGrams,
            gasBackAddress,
            true,
            empty
        );
    }

    // Legacy token migration
    fallback() external view {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        TvmSlice bodySlice = msg.data;
        uint32 functionId = bodySlice.decode(uint32);
        require(functionId == tvm.functionId(ILegacyBurnTokensCallback.burnCallback), ErrorCodes.NOT_LEGACY_BURN);
        (uint128 tokens,, address sender_address,)
            = bodySlice.decode(uint128, uint256, address, address);
        TvmCell payload = bodySlice.loadRef();
        bodySlice = bodySlice.loadRefAsSlice();
        address send_gas_to = bodySlice.decode(address);

        if (isArrayContainsAddress(config.outdatedTokenRoots, msg.sender)) {
            ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                tokens,
                sender_address,
                config.settingsDeployWalletGrams,
                send_gas_to,
                true,
                payload
            );
        } else {
            send_gas_to.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
        }
    }

    function onAcceptTokensBurn(
        uint128 tokens,
        address walletOwner,
        address,
        address remainingGasTo,
        TvmCell payload
    ) public override reserveAtLeastTargetBalance {
        if (config.tokenRoot == msg.sender) {
            burnedCount += tokens;

            (
                uint160 ethereumAddress,
                uint32 chainId
            ) = payload.toSlice().decode(uint160, uint32);

//            emit Withdraw(
//                remainingGasTo.wid,
//                remainingGasTo.value,
//                tokens,
//                ethereumAddress,
//                chainId
//            );

            TvmCell eventData = encodeEverscaleEventData(
                remainingGasTo.wid,
                remainingGasTo.value,
                tokens,
                ethereumAddress,
                chainId
            );

            IEverscaleEvent.EverscaleEventVoteData eventVoteData = IEverscaleEvent.EverscaleEventVoteData(tx.timestamp, now, eventData);

            IEverscaleEventConfiguration(config.tonConfiguration).deployEvent{
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(eventVoteData);
        } else {
            if (isArrayContainsAddress(config.outdatedTokenRoots, msg.sender)) {
                TvmCell empty;

                ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                    tokens,
                    walletOwner,
                    config.settingsDeployWalletGrams,
                    remainingGasTo,
                    true,
                    empty
                );
            } else {
                remainingGasTo.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
            }
        }
    }

    function getDetails()
        public
        view
        responsible
        returns (Configuration, address, uint128, bool)
    {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (config, owner, burnedCount, paused);
    }

    function getTokenRoot()
        public
        view
        responsible
        returns (address)
    {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} config.tokenRoot;
    }

    function getConfiguration()
        override
        public
        view
        responsible
        returns (Configuration)
    {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} config;
    }

    function setConfiguration(
        Configuration _config,
        address gasBackAddress
    ) override public onlyOwner cashBackTo(gasBackAddress) {
        config = _config;
    }

    /// @dev Compiler lies, cant be pure
    function transferTokenOwnership(
        address target,
        address newOwner
    ) external view onlyOwner reserveAtLeastTargetBalance {
        mapping(address => ITransferableOwnership.CallbackParams) empty;

        ITransferableOwnership(target).transferOwnership{
            value: 0,
            bounce: false,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(newOwner, msg.sender, empty);
    }

    /// @dev Compiler lies cant be pure
    function legacyTransferTokenOwnership(
        address target,
        address newOwner
    ) external view onlyOwner reserveAtLeastTargetBalance {
        ILegacyTransferOwner(target).transferOwner{
            value: 0,
            bounce: false,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(0, newOwner);
    }

    function isArrayContainsAddress(
        address[] array,
        address searchElement
    ) private pure returns (bool){
        for (address value: array) {
            if (searchElement == value) {
                return true;
            }
        }
        return false;
    }
}
