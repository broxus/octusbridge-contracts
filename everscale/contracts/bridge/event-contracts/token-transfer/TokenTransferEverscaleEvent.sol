pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../base/EverscaleBaseEvent.sol";
import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/IEverscaleEvent.sol";
import "./../../../utils/ErrorCodes.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

/*
    @title Basic example of Everscale event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract TokenTransferTonEvent is EverscaleBaseEvent {
    uint32 constant FORCE_CLOSE_TIMEOUT = 1 days;
    uint32 public createdAt;

    constructor(address _initializer, TvmCell _meta) EverscaleBaseEvent(_initializer, _meta) public {}


    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function close() public view {
        require(status != Status.Pending || now > createdAt + FORCE_CLOSE_TIMEOUT, ErrorCodes.EVENT_PENDING);
        address ownerAddress = getOwner();

        require(msg.sender == ownerAddress, ErrorCodes.SENDER_IS_NOT_EVENT_OWNER);
        transferAll(ownerAddress);
    }

    function onInit() override internal {
        createdAt = now;
        notifyEventStatusChanged();
    }

    function onConfirm() override internal {
        notifyEventStatusChanged();
    }

    function onReject() override internal {
        notifyEventStatusChanged();
    }

    function getOwner() private view returns(address) {
        (,,,,address ownerAddress,) = getDecodedData();
        return ownerAddress;
    }

    /*
        @dev Get event details
        @returns _initData Init data
        @returns _status Current event status
        @returns _confirmRelays List of relays who have confirmed event
        @returns _confirmRelays List of relays who have rejected event
        @returns _eventDataSignatures List of relay's TonEvent signatures
    */
    function getDetails() public view responsible returns (
        EverscaleEventInitData _eventInitData,
        Status _status,
        uint[] _confirms,
        uint[] _rejects,
        uint[] empty,
        bytes[] _signatures,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        _confirms = getVoters(Vote.Confirm);

        for (uint voter : _confirms) {
            _signatures.push(signatures[voter]);
        }

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status,
            _confirms,
            getVoters(Vote.Reject),
            getVoters(Vote.Empty),
            _signatures,
            address(this).balance,
            initializer,
            meta,
            requiredVotes
        );
    }

    /*
        @dev Get decoded event data
        @returns rootToken Token root contract address
        @returns wid Tokens sender address workchain ID
        @returns addr Token sender address body
        @returns tokens How much tokens to mint
        @returns ethereum_address Token receiver Ethereum address
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view responsible returns (
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint160 ethereum_address,
        address owner_address,
        uint32 chainId
    ) {
        (
            wid,
            addr,
            tokens,
            ethereum_address,
            chainId
        ) = decodeTonEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, addr);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            wid,
            addr,
            tokens,
            ethereum_address,
            owner_address,
            chainId
        );
    }

    /*
        @dev Notify owner contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
        @dev Used to easily collect all confirmed events by user's wallet
    */
    function notifyEventStatusChanged() internal view {
        address owner = getOwner();

        if (owner.value != 0) {
            IEventNotificationReceiver(owner).notifyEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }
}
