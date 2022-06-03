pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./BaseEvent.sol";
import "../../interfaces/event-contracts/IEverscaleEvent.sol";

import "./../../../utils/ErrorCodes.sol";


contract EverscaleBaseEvent is BaseEvent, IEverscaleEvent {
    uint32 constant FORCE_CLOSE_TIMEOUT = 1 days;
    uint32 public createdAt;

    // Event data
    EverscaleEventInitData static eventInitData;
    // Ethereum payload signatures for confirmations
    mapping (uint => bytes) public signatures;

    event Confirm(uint relay, bytes signature);

    /*
        @dev Should be deployed only by EverscaleEventConfiguration contract
        @param _initializer The address who paid for contract deployment.
        Receives all contract balance at the end of event contract lifecycle.
    */
    constructor(
        address _initializer,
        TvmCell _meta
    ) public {
        require(
            eventInitData.configuration == msg.sender,
            ErrorCodes.SENDER_NOT_EVENT_CONFIGURATION
        );

        createdAt = now;
        initializer = _initializer;
        meta = _meta;

        onInit();
    }

    function getEventInitData() public view responsible returns (EverscaleEventInitData) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} eventInitData;
    }

    function getStakingAddress() override internal view returns (address) {
        return eventInitData.staking;
    }

    function isExternalVoteCall(uint32 functionId) override internal view returns (bool){
        return functionId == tvm.functionId(confirm) || functionId == tvm.functionId(reject);
    }

    /*
        @dev Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param eventDataSignature Relay's signature of the TonEvent data
        @param voteReceiver Should be always equal to the event contract address
    */
    function confirm(bytes signature, address voteReceiver) public eventNotRejected {
        _checkVoteReceiver(voteReceiver);

        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;
        signatures[relay] = signature;

        emit Confirm(relay, signature);
        confirms++;

        // Event already confirmed
        if (status() != Status.Pending) {
            return;
        }

        if (confirms >= requiredVotes) {
            setStatusConfirmed();

            onConfirm();
        }
    }

    /*
        @dev Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param voteReceiver Should be always equal to the event contract address
    */
    function reject(address voteReceiver) public {
        _checkVoteReceiver(voteReceiver);

        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Reject;

        emit Reject(relay);
        rejects++;

        // Event already confirmed
        if (status() != Status.Pending) {
            return;
        }

        if (rejects >= requiredVotes) {
            setStatusRejected(0);

            onReject();
        }
    }

    function gasBackAddress() internal virtual view returns(address) {
        return initializer;
    }

    function close() public virtual view {
        require(
            status() != Status.Pending || now > createdAt + FORCE_CLOSE_TIMEOUT,
            ErrorCodes.WRONG_STATUS
        );

        address gasBackAddress_ = gasBackAddress();

        require(
            msg.sender == gasBackAddress_,
            ErrorCodes.SENDER_IS_NOT_EVENT_OWNER
        );

        transferAll(gasBackAddress_);
    }

    /**
        @notice Get event details
        @return _eventInitData Init data
        @return _status Current event status
        @return _confirms List of relays who have confirmed event
        @return _rejects List of relays who have rejected event
        @return empty List of relays who have not voted yet
        @return _signatures List of signatures, made by relays who confirmed event
        @return balance Event contract balance in EVERs
        @return _initializer Initializer address
        @return _meta Configuration meta
        @return _requiredVotes Required amount of confirmations to confirm event
    */
    function getDetails() external view responsible returns (
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

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status(),
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
}
