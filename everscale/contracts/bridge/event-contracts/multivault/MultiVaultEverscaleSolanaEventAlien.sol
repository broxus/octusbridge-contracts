pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../../interfaces/multivault/IMultiVaultEverscaleSolanaEventAlien.sol";
import "./../../interfaces/multivault/IProxyMultiVaultSolanaAlien.sol";
import "./../../interfaces/ITokenRootAlienSolanaEverscale.sol";

import "./../base/EverscaleSolanaBaseEvent.sol";


/// @notice Everscale-Solana event for MultiVault alien token transfer.
/// Before switching into the `Pending` status, event contract must perform
/// the following actions:
/// - Obtain the `token` token source.
contract MultiVaultEverscaleSolanaEventAlien is EverscaleSolanaBaseEvent, IMultiVaultEverscaleSolanaEventAlien {
    address proxy;
    address token;
    address remainingGasTo;
    uint128 amount;
    uint256 recipient;

    uint256 base_token;
    address expectedToken;

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
        (proxy, token, remainingGasTo, amount, recipient) = abi.decode(
            eventInitData.voteData.eventData,
            (address, address, address, uint64, uint256)
        );

        ITokenRootAlienSolanaEverscale(token).meta{
            value: 1 ton,
            callback: MultiVaultEverscaleSolanaEventAlien.receiveTokenMeta
        }();
    }

    function receiveTokenMeta(
        uint256 base_token_,
        string name,
        string symbol,
        uint8 decimals
    ) external override {
        require(msg.sender == token);

        base_token = base_token_;

        IProxyMultiVaultSolanaAlien(proxy).deriveAlienTokenRoot{
            value: 1 ton,
            callback: MultiVaultEverscaleSolanaEventAlien.receiveAlienTokenRoot
        }(
            base_token,
            name,
            symbol,
            decimals
        );
    }

    function receiveAlienTokenRoot(
        address token_
    ) external override {
        require(msg.sender == proxy);

        expectedToken = token_;

        loadRelays();
    }

    function onRelaysLoaded() override internal {
        if (token == expectedToken) {
            _updateEventData();

            status = Status.Pending;
        } else {
            status = Status.Rejected;
        }
    }

    function _updateEventData() internal {
        eventInitData.voteData.eventData = abi.encode(
            base_token,
            amount,
            recipient
        );
    }

    // TODO: add on-bounce all over the multivault contracts to prevent stuck in Initializing
    function getDecodedData() external override responsible returns(
        address proxy_,
        address token_,
        address remainingGasTo_,
        uint128 amount_,
        uint256 recipient_,
        uint256 base_token_
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(
            proxy,
            token,
            remainingGasTo,
            amount,
            recipient,
            base_token
        );
    }

    onBounce(TvmSlice slice) external {
        uint32 selector = slice.decode(uint32);

        if (
            selector == tvm.functionId(ITokenRootAlienSolanaEverscale.meta) ||
            selector == tvm.functionId(IProxyMultiVaultSolanaAlien.deriveAlienTokenRoot)
        ) {
            status = Status.Rejected;

            loadRelays();
        }
    }
}
