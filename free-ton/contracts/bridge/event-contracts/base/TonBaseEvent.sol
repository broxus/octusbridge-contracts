pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./BaseEvent.sol";
import "../../interfaces/event-contracts/ITonEvent.sol";

contract TonBaseEvent is BaseEvent, ITonEvent {
    // Event data
    TonEventInitData static eventInitData;
    // Ethereum payload signatures for confirmations
    mapping (uint => bytes) public signatures;

    event Confirm(uint relay, bytes signature);

    /*
        @dev Should be deployed only by TonEventConfiguration contract
        @param _initializer The address who paid for contract deployment.
        Receives all contract balance at the end of event contract lifecycle.
    */
    constructor(
        address _initializer,
        TvmCell _meta
    ) public {
        eventInitData.configuration = msg.sender;

        status = Status.Initializing;
        initializer = _initializer;
        meta = _meta;
        onInit();
        loadRelays();
    }

    function getEventInitData() public view responsible returns (TonEventInitData) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} eventInitData;
    }

    function onInit() virtual internal {}
    function onConfirm() virtual internal {}
    function onReject() virtual internal {}

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
    function confirm(bytes signature, address voteReceiver) public {
        _checkVoteReceiver(voteReceiver);

        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;
        signatures[relay] = signature;

        emit Confirm(relay, signature);
        confirms++;

        // Event already confirmed
        if (status != Status.Pending) {
            return;
        }

        if (confirms >= requiredVotes) {
            status = Status.Confirmed;
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
        if (status != Status.Pending) {
            return;
        }

        if (rejects >= requiredVotes) {
            status = Status.Rejected;
            onReject();
        }
    }
}
