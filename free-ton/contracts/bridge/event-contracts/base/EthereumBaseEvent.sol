pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./BaseEvent.sol";
import "../../interfaces/event-contracts/IEthereumEvent.sol";

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
        eventInitData.configuration = msg.sender;

        status = Status.Initializing;
        initializer = _initializer;
        meta = _meta;
        onInit();
        loadRelays();
    }

    function getEventInitData() public view responsible returns (EthereumEventInitData) {
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

    /// @dev Confirm event. Can be called only by relay which is in charge at this round.
    /// Can be called only when event configuration is in Pending status
    function confirm() public eventPending {
        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;
        confirms++;

        emit Confirm(relay);

        if (confirms >= requiredVotes) {
            status = Status.Confirmed;
            onConfirm();
        }
    }

    /// @dev Reject event. Can be called only by relay which is in charge at this round.
    /// Can be called only when event configuration is in Pending status. If enough rejects collected
    /// changes status to Rejected, notifies tokens receiver and withdraw balance to initializer.
    function reject() public eventPending {
        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Reject;
        rejects++;

        emit Reject(relay);

        if (rejects >= requiredVotes) {
            status = Status.Rejected;
            onReject();
        }
    }



}
