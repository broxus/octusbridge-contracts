pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/TIP3TokenRoot.sol";

import "./../base/EverscaleSolanaBaseEvent.sol";
import "./../../interfaces/multivault/IMultiVaultEverscaleSolanaEventNative.sol";


/// @notice Everscale-Solana event for MultiVault native token transfer.
/// Before switching into the `Pending` status, event contract must perform
/// the following actions:
/// - Verify that the `tokenWallet` is a correct token wallet for `token`, owned by the proxy
/// - Obtain the `token` metadata (name, symbol, decimals)
/// - Rewrite the `eventData` with the correct value
contract MultiVaultEverscaleSolanaEventNative is EverscaleSolanaBaseEvent, IMultiVaultEverscaleSolanaEventNative {
    address proxy;
    address tokenWallet;
    address token;
    address remainingGasTo;
    uint128 amount;
    uint256 recipient;

    string name;
    string symbol;
    uint8 decimals;
    address expectedTokenWallet;

    constructor(
        address _initializer,
        TvmCell _meta
    ) EverscaleSolanaBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function close() external view {
        require(
            status != Status.Pending || now > createdAt + FORCE_CLOSE_TIMEOUT,
            ErrorCodes.EVENT_PENDING
        );

        require(msg.sender == remainingGasTo, ErrorCodes.SENDER_IS_NOT_EVENT_OWNER);
        transferAll(remainingGasTo);
    }

    function onInit() override internal {
        (
            proxy,
            tokenWallet,
            token,
            remainingGasTo,
            amount,
            recipient
        ) = abi.decode(
            eventInitData.voteData.eventData,
            (address, address, address, address, uint64, uint256)
        );

        ITokenRoot(token).name{
            value: 0.1 ton,
            callback: MultiVaultEverscaleSolanaEventNative.receiveTokenName
        }();

        ITokenRoot(token).symbol{
            value: 0.1 ton,
            callback: MultiVaultEverscaleSolanaEventNative.receiveTokenSymbol
        }();

        ITokenRoot(token).decimals{
            value: 0.1 ton,
            callback: MultiVaultEverscaleSolanaEventNative.receiveTokenDecimals
        }();

        ITokenRoot(token).walletOf{
            value: 0.1 ton,
            callback: MultiVaultEverscaleSolanaEventNative.receiveProxyTokenWallet
        }(proxy);
    }

    function receiveTokenName(
        string name_
    ) external override {
        require(msg.sender == token);

        name = name_;
    }

    function receiveTokenSymbol(
        string symbol_
    ) external override {
        require(msg.sender == token);

        symbol = symbol_;
    }

    function receiveTokenDecimals(
        uint8 decimals_
    ) external override {
        require(msg.sender == token);

        decimals = decimals_;
    }

    function receiveProxyTokenWallet(
        address tokenWallet_
    ) external override {
        require(msg.sender == token);

        expectedTokenWallet = tokenWallet_;

        loadRelays();
    }

    function onRelaysLoaded() override internal {
        if (tokenWallet == expectedTokenWallet) {
            _updateEventData();

            status = Status.Pending;
        } else {
            status = Status.Rejected;
        }
    }

    function getDecodedData() external override responsible returns(
        address proxy_,
        address tokenWallet_,
        address token_,
        address remainingGasTo_,
        uint128 amount_,
        uint256 recipient_,
        string name_,
        string symbol_,
        uint8 decimals_
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(
            proxy,
            tokenWallet,
            token,
            remainingGasTo,
            amount,
            recipient,
            name,
            symbol,
            decimals
        );
    }

    function _updateEventData() internal {
        eventInitData.voteData.eventData = abi.encode(
            token.wid,
            token.value,

            name,
            symbol,
            decimals,

            amount,
            recipient
        );
    }

    onBounce(TvmSlice slice) external {
        uint32 selector = slice.decode(uint32);

        if (
            selector == tvm.functionId(TIP3TokenRoot.name) ||
            selector == tvm.functionId(TIP3TokenRoot.symbol) ||
            selector == tvm.functionId(TIP3TokenRoot.decimals) ||
            selector == tvm.functionId(ITokenRoot.walletOf)
        ) {
            status = Status.Rejected;

            loadRelays();
        }
    }
}
