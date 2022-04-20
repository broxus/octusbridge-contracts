pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../interfaces/ISolanaEverscaleProxyExtended.sol";
import "./../interfaces/multivault/IProxyMultiVaultSolanaNative.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleSolanaEventConfiguration.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenWallet.sol";

import "./../../utils/ErrorCodes.sol";
import "./../../utils/TransferUtils.sol";


import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";


contract ProxyMultiVaultSolanaNative is
    InternalOwner,
    TransferUtils,
    CheckPubKey,
    RandomNonce,
    ISolanaEverscaleProxyExtended,
    IProxyMultiVaultSolanaNative,
    IAcceptTokensTransferCallback
{
    Configuration config;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;
    uint8 api_version = 0;

    constructor(
        address owner_
    ) public checkPubKey {
        tvm.accept();

        api_version = 1;
        setOwnership(owner_);
    }

    /// @notice Get current contract API version.
    /// Each time contract is upgraded, API version is incremented.
    /// @return Current API version
    function apiVersion() external override view responsible returns(uint8) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} api_version;
    }

    /// @notice Handles incoming token transfer
    /// Initializes native token withdraw (eg WEVER or BRIDGE)
    /// @param tokenRoot Transferred token root address.
    /// @param amount Tokens amount
    /// @param sender Sender address
    /// @param senderWallet Sender token wallet address
    /// @param remainingGasTo Address to send remaining gas to
    /// @param payload TvmCell encoded (uint160 recipient, uint256 chainId)
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) override external reserveMinBalance(MIN_CONTRACT_BALANCE) {

        (uint256 recipient, uint128 accountSeed) = abi.decode(payload, (uint256, uint128));

        uint64 amount_solana = uint64(amount);

        TvmCell eventData = abi.encode(
            address(this), // Proxy address
            msg.sender, // Token wallet address, must be validated in the event contract
            tokenRoot, // Token root
            remainingGasTo, // Remaining gas to
            amount_solana, // Amount of tokens to withdraw
            recipient // Solana recipient address
        );

        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData = IEverscaleSolanaEvent.EverscaleSolanaEventVoteData(
            accountSeed,
            eventData
        );

        IEverscaleSolanaEventConfiguration(config.everscaleConfiguration).deployEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventVoteData);
    }

    /// @notice Handles native token transfer from Solana.
    /// Releases token from the Proxy balance.
    /// @param meta Cell encoded (address token_wallet, uint128 amount, address recipient)
    /// @param remainingGasTo Gas back address
    function onEventConfirmedExtended(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData,
        TvmCell meta,
        address remainingGasTo
    ) external override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(config.solanaConfiguration == msg.sender);

        (
            address token_wallet,
            uint64 amount_solana,
            address recipient
        ) = abi.decode(
            meta,
            (address, uint64, address)
        );

        uint128 amount = uint128(amount_solana);

        TvmCell empty;

        ITokenWallet(token_wallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            amount,
            recipient,
            config.deployWalletValue,
            remainingGasTo,
            true,
            empty
        );
    }

    function getConfiguration()
        override
        external
        view
        responsible
        returns (Configuration)
    {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} config;
    }

    function setConfiguration(
        Configuration _config,
        address remainingGasTo
    ) override external onlyOwner cashBackTo(remainingGasTo) {
        config = _config;
    }

    function _isArrayContainsAddress(
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
    ) external onlyOwner cashBack {
        TvmCell data = abi.encode(
            config,
            api_version,
            _randomNonce
        );

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(data);
    }

    function onCodeUpgrade(TvmCell data) private {
        (Configuration config_, uint8 api_version_, uint _randomNonce_) = abi.decode(
            data,
            (Configuration, uint8, uint)
        );

        config = config_;
        api_version = api_version_ + 1;
        _randomNonce = _randomNonce_;
    }
}