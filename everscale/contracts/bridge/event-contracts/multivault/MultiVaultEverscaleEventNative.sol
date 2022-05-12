pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/TIP3TokenRoot.sol";

import "./../base/EverscaleBaseEvent.sol";
import "./../../interfaces/multivault/IMultiVaultEverscaleEventNative.sol";


/// @notice Everscale-EVM event for MultiVault native token transfer.
/// Before switching into the `Pending` status, event contract must perform
/// the following actions:
/// - Verify that the `tokenWallet` is a correct token wallet for `token`, owned by the proxy
/// - Obtain the `token` metadata (name, symbol, decimals)
/// - Rewrite the `eventData` with the correct value
contract MultiVaultEverscaleEventNative is EverscaleBaseEvent, IMultiVaultEverscaleEventNative {
    address proxy;
    address tokenWallet;
    address token;
    address remainingGasTo;
    uint128 amount;
    uint160 recipient;
    uint256 chainId;

    string name;
    string symbol;
    uint8 decimals;
    address expectedTokenWallet;

    constructor(
        address _initializer,
        TvmCell _meta
    ) EverscaleBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function onInit() override internal {
        setStatusInitializing();

        (
            proxy,
            tokenWallet,
            token,
            remainingGasTo,
            amount,
            recipient,
            chainId
        ) = abi.decode(
            eventInitData.voteData.eventData,
            (address, address, address, address, uint128, uint160, uint256)
        );

        ITokenRoot(token).name{
            value: 0.1 ton,
            bounce: true,
            callback: MultiVaultEverscaleEventNative.receiveTokenName
        }();

        ITokenRoot(token).symbol{
            value: 0.1 ton,
            bounce: true,
            callback: MultiVaultEverscaleEventNative.receiveTokenSymbol
        }();

        ITokenRoot(token).decimals{
            value: 0.1 ton,
            bounce: true,
            callback: MultiVaultEverscaleEventNative.receiveTokenDecimals
        }();

        ITokenRoot(token).walletOf{
            value: 0.1 ton,
            bounce: true,
            callback: MultiVaultEverscaleEventNative.receiveProxyTokenWallet
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

        if (tokenWallet == expectedTokenWallet) {
            _updateEventData();

            loadRelays();
        } else {
            setStatusRejected(1);
        }
    }

    function getDecodedData() external override responsible returns(
        address proxy_,
        address tokenWallet_,
        address token_,
        address remainingGasTo_,
        uint128 amount_,
        uint160 recipient_,
        uint256 chainId_,
        string name_,
        string symbol_,
        uint8 decimals_
    ) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS}(
            proxy,
            tokenWallet,
            token,
            remainingGasTo,
            amount,
            recipient,
            chainId,
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
            recipient,
            chainId
        );
    }

    function gasBackAddress() internal override view returns(address) {
        return remainingGasTo;
    }

    onBounce(TvmSlice slice) external {
        uint32 selector = slice.decode(uint32);

        if (
            (selector == tvm.functionId(TIP3TokenRoot.name) && msg.sender == token )||
            (selector == tvm.functionId(TIP3TokenRoot.symbol) && msg.sender == token) ||
            (selector == tvm.functionId(TIP3TokenRoot.decimals) && msg.sender == token) ||
            (selector == tvm.functionId(ITokenRoot.walletOf) && msg.sender == token)
        ) {
            setStatusRejected(2);
        }
    }
}
