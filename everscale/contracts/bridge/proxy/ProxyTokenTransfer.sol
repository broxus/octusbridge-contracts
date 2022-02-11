pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../utils/ErrorCodes.sol";
import "./../../utils/cell-encoder/CellEncoder.sol";
import "./../../utils/TransferUtils.sol";

import "./../interfaces/IProxy.sol";
import "./../interfaces/IProxyTokenTransferConfigurable.sol";
import "./../interfaces/ILegacyBurnTokensCallback.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITransferableOwnership.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

/// @title Proxy for cross chain token transfers
/// @dev In case of ETH-TON token transfer, this proxy should receive
/// `onEventConfirmed` callback from the corresponding EthereumEventConfiguration. Then it mints
/// the specified amount of tokens to the user.
/// In case of TON-ETH token transfer, this proxy should receive burn callback from the token
/// and deploy event. This event will be signed by relays so it can be sent to the corresponding EVM Vault.
contract ProxyTokenTransfer is
    IProxy,
    IProxyTokenTransferConfigurable,
    ILegacyBurnTokensCallback,
    IAcceptTokensBurnCallback,
    RandomNonce,
    CellEncoder,
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
    ) public override onlyEthereumConfiguration reserveBalance {
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
    function burnCallback(
        uint128 tokens,
        TvmCell,
        uint256,
        address sender_address,
        address,
        address send_gas_to
    ) public override reserveBalance {
        if (isArrayContainsAddress(config.outdatedTokenRoots, msg.sender)) {
            TvmCell empty;

            ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                tokens,
                sender_address,
                config.settingsDeployWalletGrams,
                send_gas_to,
                true,
                empty
            );
        } else {
            send_gas_to.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
        }
    }

    function onAcceptTokensBurn(
        uint128 tokens,
        address walletOwner,
        address wallet,
        address remainingGasTo,
        TvmCell payload
    ) public override reserveBalance {
        if (config.tokenRoot == msg.sender) {
            burnedCount += tokens;

            (
                uint160 ethereumAddress,
                uint32 chainId
            ) = payload.toSlice().decode(uint160, uint32);

//            emit Withdraw(
//                sender_address.wid,
//                sender_address.value,
//                tokens,
//                ethereumAddress,
//                chainId
//            );

            TvmCell eventData = encodeTonEventData(
                walletOwner.wid,
                walletOwner.value,
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

    function transferTokenOwnership(
        address target,
        address newOwner
    ) external view onlyOwner reserveBalance {
        mapping(address => ITransferableOwnership.CallbackParams) empty;

        ITransferableOwnership(target).transferOwnership{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(newOwner, msg.sender, empty);
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
