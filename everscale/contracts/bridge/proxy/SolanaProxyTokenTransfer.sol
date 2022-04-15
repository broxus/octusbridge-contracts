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
/// and deploy event. This event will be signed by relays so it can be sent to the corresponding Solana Program.
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
            uint256 sender_addr,
            uint64 tokens_solana,
            address receiver_addr
        ) = decodeSolanaEverscaleEventData(eventData.voteData.eventData);

        require(tokens_solana > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require(receiver_addr.value != 0, ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        TvmCell empty;

        uint128 tokens = uint128(tokens_solana);

        if (config.solanaDecimals > config.everscaleDecimals) {
            uint128 mul10 = uint128(10) ** uint128(config.solanaDecimals - config.everscaleDecimals);
            tokens = tokens * mul10;
        } else {
            uint128 mul10 = uint128(10) ** uint128(config.everscaleDecimals - config.solanaDecimals);
            tokens = tokens / mul10;
        }

        ITokenRoot(config.tokenRoot).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            tokens,
            receiver_addr,
            config.settingsDeployWalletGrams,
            gasBackAddress,
            true,
            empty
        );
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

            uint256 solanaOwnerAddress = payload.toSlice().decode(uint256);

            address senderAddress = address.makeAddrStd(remainingGasTo.wid, remainingGasTo.value);

            if (config.solanaDecimals > config.everscaleDecimals) {
                uint128 mul10 = uint128(10) ** uint128(config.solanaDecimals - config.everscaleDecimals);
                tokens = tokens * mul10;
            } else {
                uint128 mul10 = uint128(10) ** uint128(config.everscaleDecimals - config.solanaDecimals);
                tokens = tokens / mul10;
            }

            uint64 tokens_solana = uint64(tokens);

            TvmCell eventData = encodeEverscaleSolanaEventData(
                senderAddress,
                tokens_solana,
                solanaOwnerAddress,
                config.solanaTokenSymbol
            );

            IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData = IEverscaleSolanaEvent.EverscaleSolanaEventVoteData(tx.timestamp, eventData);

            IEverscaleSolanaEventConfiguration(config.everConfiguration).deployEvent{
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(eventVoteData);
        } else {
            remainingGasTo.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
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
