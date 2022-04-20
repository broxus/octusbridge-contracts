pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../interfaces/ISolanaEverscaleProxyExtended.sol";
import "./../interfaces/multivault/IProxyMultiVaultSolanaAlien.sol";
import "./../interfaces/event-configuration-contracts/IEverscaleSolanaEventConfiguration.sol";

import "./../../utils/ErrorCodes.sol";
import "./../../utils/TransferUtils.sol";

import "./../alien-token/TokenRootAlienSolanaEverscale.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";


contract ProxyMultiVaultSolanaAlien is
    InternalOwner,
    TransferUtils,
    CheckPubKey,
    RandomNonce,
    IAcceptTokensBurnCallback,
    ISolanaEverscaleProxyExtended,
    IProxyMultiVaultSolanaAlien
{
    Configuration config;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;
    uint8 api_version = 0;

    constructor(
        address owner_
    ) public checkPubKey {
        tvm.accept();

        setOwnership(owner_);
        api_version = 1;
    }

    /// @notice Get current contract API version.
    /// Each time contract is upgraded, API version is incremented.
    /// @return Current API version
    function apiVersion() external override view responsible returns(uint8) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} api_version;
    }

    /// @notice Handles token burn.
    /// Initializes alien transfer (eg BSC CAKE or ETH AAVE).
    /// @param amount Tokens amount
    /// @param remainingGasTo Address to send remaining gas to
    /// @param payload TvmCell encoded (uint160 recipient)
    function onAcceptTokensBurn(
        uint128 amount,
        address,
        address,
        address remainingGasTo,
        TvmCell payload
    ) public override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        (uint256 recipient, uint128 accountSeed) = abi.decode(payload, (uint256, uint128));

        uint64 amount_solana = uint64(amount);

        TvmCell eventData = abi.encode(
            address(this), // Proxy address, used in event contract for validating token root
            msg.sender, // Everscale token root address
            remainingGasTo, // Remaining gas receiver (on event contract destroy)
            amount_solana, // Amount of tokens to withdraw
            recipient // Recipient address in Solana network
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

    /// @notice Handles alien token transfer from Solana. Token address is derived automatically and MUST
    /// be deployed before. See note on `deployAlienToken`
    /// @param remainingGasTo Gas back address
    function onEventConfirmedExtended(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData,
        TvmCell meta,
        address remainingGasTo
    ) external override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(config.solanaConfiguration == msg.sender);

        (
            address token,
            uint64 amount_solana,
            address recipient
        ) = abi.decode(
            meta,
            (address, uint64, address)
        );

        uint128 amount = uint128(amount_solana);

        TvmCell empty;

        ITokenRoot(token).mint{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            amount,
            recipient,
            config.deployWalletValue,
            remainingGasTo,
            true,
            empty
        );
    }

    /// @notice Derives root address for alien token, without deploying it
    /// @param token Solana token address
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param decimals Token decimals
    function deriveAlienTokenRoot(
        uint256 token,
        string name,
        string symbol,
        uint8 decimals
    ) public override responsible returns (address) {
        TvmCell stateInit = _buildAlienTokenRootInitState(
            token,
            name,
            symbol,
            decimals
        );

        // TODO: check all responsible returns
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} address(tvm.hash(stateInit));
    }

    /// @notice Deploys Everscale token for any Solana token
    /// @param token Solana token address
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param decimals Token decimals
    /// @param remainingGasTo Remaining gas to
    function deployAlienToken(
        uint256 token,
        string name,
        string symbol,
        uint8 decimals,
        address remainingGasTo
    ) external override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        TvmCell stateInit = _buildAlienTokenRootInitState(
            token,
            name,
            symbol,
            decimals
        );

        new TokenRootAlienSolanaEverscale {
            stateInit: stateInit,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            address(this), // Initial supply recipient
            0, // Initial supply
            config.deployWalletValue, // Deploy wallet value
            false, // Mint disabled
            false, // Burn by root disabled
            false, // Burn paused
            remainingGasTo // Remaining gas receiver
        );
    }

    /// @notice Proxies arbitrary message to any contract.
    /// Should be used for interacting with `onlyOwner` alien token root methods.
    /// This can be called only by `owner`.
    /// @param recipient Recipient address
    /// @param message TvmCell message, eg function call
    function sendMessage(
        address recipient,
        TvmCell message
    ) external override onlyOwner reserveMinBalance(MIN_CONTRACT_BALANCE) {
        TvmBuilder payload;
        payload.store(message);

        recipient.transfer({
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            body: payload.toCell()
        });
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

    function _buildAlienTokenRootInitState(
        uint256 token,
        string name,
        string symbol,
        uint8 decimals
    ) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TokenRootAlienSolanaEverscale,
            varInit: {
                randomNonce_: 0,
                deployer_: address(this),
                rootOwner_: address(this),

                base_token_: token,

                name_: name,
                symbol_: symbol,
                decimals_: decimals,

                walletCode_: config.alienTokenWalletCode,
                platformCode_: config.alienTokenWalletPlatformCode
            },
            pubkey: 0,
            code: config.alienTokenRootCode
        });
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
