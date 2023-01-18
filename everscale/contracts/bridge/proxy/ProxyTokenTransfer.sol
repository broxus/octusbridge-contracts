pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../utils/ErrorCodes.sol";
import "./../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import "./../../utils/TransferUtils.sol";
import "./../libraries/BurnType.sol";

import "./../interfaces/ISolanaEverscaleProxy.sol";
import "./../interfaces/IEthereumEverscaleProxy.sol";
import "./../interfaces/IProxyTokenTransfer.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleSolanaEventConfiguration.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleEthereumEventConfiguration.sol";
import "./../interfaces/legacy/ILegacyBurnTokensCallback.sol";
import "./../interfaces/legacy/ILegacyTransferOwner.sol";

import "../../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";
import "../../bridge/interfaces/event-contracts/IEverscaleEthereumEvent.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITransferableOwnership.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";


/// @title Proxy for cross chain token transfers
/// @dev Supports both Solana and EVM to Everscale transfers
/// One proxy per token
contract ProxyTokenTransfer is
    ISolanaEverscaleProxy,
    IEthereumEverscaleProxy,
    IProxyTokenTransfer,
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
    uint128 mintedCount;

    bool paused = false;

    modifier onlySolanaConfiguration() {
        require(
            config.solanaEverscaleConfiguration == msg.sender,
            ErrorCodes.NOT_SOLANA_CONFIG
        );

        _;
    }

    modifier onlyEthereumConfiguration() {
        require(
            isArrayContainsAddress(config.ethereumEverscaleConfigurations, msg.sender),
            ErrorCodes.NOT_ETHEREUM_CONFIG
        );

        _;
    }

    constructor(address owner_) public checkPubKey {
        tvm.accept();

        setOwnership(owner_);
    }

    /// @notice Hook for Solana-Everscale event confirmation
    /// Can be called only by Solana-Everscale configuration
    /// @param eventData Solana-Everscale event data
    /// @param gasBackAddress Gas recipient
    function onSolanaEventConfirmed(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventData,
        address gasBackAddress
    ) external override onlySolanaConfiguration reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(!paused, ErrorCodes.PROXY_PAUSED);
        require(config.tokenRoot.value != 0, ErrorCodes.PROXY_TOKEN_ROOT_IS_EMPTY);

        (
            ,
            uint128 tokens_solana,
            address recipient
        ) = decodeSolanaEverscaleEventData(eventData.voteData.eventData);

        require(tokens_solana > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require(recipient.value != 0, ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        _mint(tokens_solana, recipient, gasBackAddress);
    }

    /// @notice Hook for EVM-Everscale token transfer event confirmation
    /// Can be called only by one of Ethereum-Everscale configurations
    /// @param eventData Ethereum-Everscale event data
    /// @param gasBackAddress Gas recipient
    function onEventConfirmed(
        IEthereumEverscaleEvent.EthereumEverscaleEventInitData eventData,
        address gasBackAddress
    ) public override onlyEthereumConfiguration reserveAtLeastTargetBalance {
        require(!paused, ErrorCodes.PROXY_PAUSED);
        require(config.tokenRoot.value != 0, ErrorCodes.PROXY_TOKEN_ROOT_IS_EMPTY);

        (
            uint128 tokens,
            int8 recipient_wid,
            uint256 recipient_addr
        ) = decodeEthereumEverscaleEventData(eventData.voteData.eventData);

        address recipient = address.makeAddrStd(recipient_wid, recipient_addr);

        require(tokens > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require(recipient.value != 0, ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        _mint(tokens, recipient, gasBackAddress);
    }

    function _mint(
        uint128 amount,
        address recipient,
        address gasBackAddress
    ) internal view {
        TvmCell empty;

        ITokenRoot(config.tokenRoot).mint{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            amount,
            recipient,
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

    /// @notice Accept token burn callback
    /// Can be called only by `config.tokenRoot`
    /// @param tokens Burn amount
    /// @param remainingGasTo Gas recipient
    /// @param payload Cell-encoded (BurnType burnType, TvmCell burnPayload)
    function onAcceptTokensBurn(
        uint128 tokens,
        address walletOwner,
        address,
        address remainingGasTo,
        TvmCell payload
    ) public override reserveAtLeastTargetBalance {
        if (config.tokenRoot == msg.sender) {
            burnedCount += tokens;

            (uint8 burnType, TvmCell burnPayload) = abi.decode(payload, (uint8, TvmCell));

            if (burnType == BurnType.Solana) {
                (
                    uint256 solanaOwnerAddress,
                    IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[] executeAccounts
                ) = abi.decode(burnPayload, (uint256, IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[]));

                TvmCell eventData = encodeEverscaleSolanaEventData(
                    remainingGasTo,
                    tokens,
                    solanaOwnerAddress
                );

                IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData = IEverscaleSolanaEvent.EverscaleSolanaEventVoteData(
                    tx.timestamp,
                    now,
                    executeAccounts,
                    eventData
                );

                IEverscaleSolanaEventConfiguration(config.everscaleSolanaConfiguration).deployEvent{
                    value: 0,
                    flag: MsgFlag.ALL_NOT_RESERVED
                }(eventVoteData);
            } else if (burnType == BurnType.EVM) {
                (
                    uint160 ethereumAddress,
                    uint32 chainId
                ) = abi.decode(burnPayload, (uint160, uint32));

                TvmCell eventData = encodeEverscaleEthereumEventData(
                    remainingGasTo.wid,
                    remainingGasTo.value,
                    tokens,
                    ethereumAddress,
                    chainId
                );

                IEverscaleEthereumEvent.EverscaleEthereumEventVoteData eventVoteData = IEverscaleEthereumEvent.EverscaleEthereumEventVoteData(
                    tx.timestamp,
                    now,
                    eventData
                );

                IEverscaleEthereumEventConfiguration(config.everscaleEthereumConfiguration).deployEvent{
                    value: 0,
                    flag: MsgFlag.ALL_NOT_RESERVED
                }(eventVoteData);
            }
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

    function upgrade(
        TvmCell code
    ) external override onlyOwner {
        TvmCell data = abi.encode(
            _randomNonce,
            owner,
            config,
            burnedCount,
            mintedCount,
            paused
        );

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(data);
    }

    function onCodeUpgrade(TvmCell) private {}
}
