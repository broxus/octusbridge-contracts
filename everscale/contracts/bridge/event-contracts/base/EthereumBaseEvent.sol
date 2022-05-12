pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./BaseEvent.sol";
import "../../interfaces/event-contracts/IEthereumEvent.sol";

import "./../../../utils/ErrorCodes.sol";


contract EthereumBaseEvent is BaseEvent, IEthereumEvent {
    // Event data
    EthereumEventInitData static eventInitData;

    event Confirm(uint relay);

    /// @dev Should be deployed only by corresponding EthereumEventConfiguration contract
    /// @param _initializer The address who paid for contract deployment.
    /// Receives all contract balance at the end of event contract lifecycle.
    constructor(
        address _initializer,
        TvmCell _meta
    ) public {
        require(
            eventInitData.configuration == msg.sender,
            ErrorCodes.SENDER_NOT_EVENT_CONFIGURATION
        );

        initializer = _initializer;
        meta = _meta;

        onInit();
    }

    function getEventInitData() public view responsible returns (EthereumEventInitData) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} eventInitData;
    }

    function getStakingAddress() override internal view returns (address) {
        return eventInitData.staking;
    }

    function isExternalVoteCall(uint32 functionId) override internal view returns (bool){
        return functionId == tvm.functionId(confirm) || functionId == tvm.functionId(reject);
    }

    /// @dev Confirm event. Can be called only by relay which is in charge at this round.
    /// Can be called only when event configuration is in Pending status
    /// @param voteReceiver Should be always equal to the event contract address
    function confirm(address voteReceiver) public eventPending {
        _checkVoteReceiver(voteReceiver);

        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;
        confirms++;

        emit Confirm(relay);

        if (confirms >= requiredVotes) {
            setStatusConfirmed();

            onConfirm();
        }
    }

    /// @dev Reject event. Can be called only by relay which is in charge at this round.
    /// Can be called only when event configuration is in Pending status. If enough rejects collected
    /// changes status to Rejected, notifies tokens receiver and withdraw balance to initializer.
    /// @param voteReceiver Should be always equal to the event contract address
    function reject(address voteReceiver) public eventPending {
        _checkVoteReceiver(voteReceiver);

        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Reject;
        rejects++;

        emit Reject(relay);

        if (rejects >= requiredVotes) {
            setStatusRejected(0);

            onReject();
        }
    }

    /**
        @notice Get event details
        @return _eventInitData Init data
        @return _status Current event status
        @return _confirms List of relays who have confirmed event
        @return _rejects List of relays who have rejected event
        @return empty List of relays who have not voted yet
        @return balance Event contract balance in EVERs
        @return _initializer Initializer address
        @return _meta Configuration meta
        @return _requiredVotes Required amount of confirmations to confirm event
    */
    function getDetails() external view responsible returns (
        EthereumEventInitData _eventInitData,
        Status _status,
        uint[] _confirms,
        uint[] _rejects,
        uint[] empty,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status(),
            getVoters(Vote.Confirm),
            getVoters(Vote.Reject),
            getVoters(Vote.Empty),
            address(this).balance,
            initializer,
            meta,
            requiredVotes
        );
    }
}
