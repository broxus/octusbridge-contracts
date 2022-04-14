pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../utils/ErrorCodes.sol";
import "./../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import "./../../utils/TransferUtils.sol";

import "./../interfaces/ISolanaEverscaleProxy.sol";
import "./../interfaces/ISolanaProxyTokenTransferConfigurable.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleSolanaEventConfiguration.sol";
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
/// @dev In case of Solana-Everscale token transfer, this proxy should receive
/// `onEventConfirmed` callback from the corresponding SolanaEverscaleEventConfiguration. Then it mints
/// the specified amount of tokens to the user.
/// In case of Everscale-Solana token transfer, this proxy should receive burn callback from the token
/// and deploy event. This event will be signed by relays so it can be sent to the corresponding EVM Vault.
contract SolanaProxyTokenTransfer is
    ISolanaEverscaleProxy,
ISolanaProxyTokenTransferConfigurable,
    IAcceptTokensBurnCallback,
    RandomNonce,
    ProxyTokenTransferCellEncoder,
    InternalOwner,
    TransferUtils,
    CheckPubKey
{
    event Withdraw(int8 wid, uint256 addr, uint128 tokens, uint256 solana_addr);
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    Configuration config;
    uint128 burnedCount;
    bool paused = false;

    modifier onlySolanaConfiguration() {
        require(config.solanaConfiguration == msg.sender, ErrorCodes.NOT_SOLANA_CONFIG);
        _;
    }

    constructor(address owner_) public checkPubKey {
        tvm.accept();

        setOwnership(owner_);
    }

    function onEventConfirmed(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventData,
        address gasBackAddress
    ) public override onlySolanaConfiguration reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(!paused, ErrorCodes.PROXY_PAUSED);
        require(config.tokenRoot.value != 0, ErrorCodes.PROXY_TOKEN_ROOT_IS_EMPTY);

        (
            uint64 tokens,
            address owner_addr
        ) = decodeSolanaEverscaleEventData(eventData.voteData.eventData);

        require(tokens > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require(owner_addr.value != 0, ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        TvmCell empty;

        ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            uint128(tokens),
            owner_addr,
            config.settingsDeployWalletGrams,
            gasBackAddress,
            true,
            empty
        );
    }

    // Legacy token migration
    fallback() external {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        TvmSlice bodySlice = msg.data;
        uint32 functionId = bodySlice.decode(uint32);
        require(functionId == tvm.functionId(ILegacyBurnTokensCallback.burnCallback), ErrorCodes.NOT_LEGACY_BURN);
        (uint128 tokens, uint256 sender_public_key, address sender_address, address wallet_address)
            = bodySlice.decode(uint128, uint256, address, address);
        TvmCell payload = bodySlice.loadRef();
        bodySlice = bodySlice.loadRefAsSlice();
        address send_gas_to = bodySlice.decode(address);

        if (isArrayContainsAddress(config.outdatedTokenRoots, msg.sender)) {
            TvmCell empty;

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
        address wallet,
        address remainingGasTo,
        TvmCell payload
    ) public override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        if (config.tokenRoot == msg.sender) {
            burnedCount += tokens;

            (
            uint256 solanaOwnerAddress,
            uint256 solanaTokenWalletAddress
            ) = payload.toSlice().decode(uint256, uint256);

            address senderAddress = address.makeAddrStd(remainingGasTo.wid, remainingGasTo.value);

            TvmCell eventData = encodeEverscaleSolanaEventData(
                senderAddress,
                uint64(tokens),
                solanaOwnerAddress,
                solanaTokenWalletAddress
            );

            IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData = IEverscaleSolanaEvent.EverscaleSolanaEventVoteData(tx.timestamp, eventData);

            IEverscaleSolanaEventConfiguration(config.everConfiguration).deployEvent{
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
    ) external view onlyOwner reserveMinBalance(MIN_CONTRACT_BALANCE) {
        mapping(address => ITransferableOwnership.CallbackParams) empty;

        ITransferableOwnership(target).transferOwnership{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(newOwner, msg.sender, empty);
    }

    function legacyTransferTokenOwnership(
        address target,
        address newOwner
    ) external view onlyOwner reserveMinBalance(MIN_CONTRACT_BALANCE) {
        ILegacyTransferOwner(target).transferOwner{
            value: 0,
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
