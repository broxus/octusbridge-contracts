pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../../../utils/ErrorCodes.sol";
import "../../../utils/TransferUtils.sol";
import "../../interfaces/IStaking.sol";
import "../../interfaces/IRound.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/IBasicEvent.sol";

import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


abstract contract BaseEvent is IBasicEvent, TransferUtils {
    // Event contract status
    Status private _status;
    // Relays votes
    mapping (uint => Vote) public votes;
    // Event contract deployer
    address public initializer;
    // Event configuration meta
    TvmCell public meta;
    // How many votes required for confirm / reject
    uint32 public requiredVotes;
    // How many relays confirm event
    uint16 public confirms;
    // How many relays rejects event
    uint16 public rejects;
    // address of relay round contract
    address public relay_round;
    // number of relay round
    uint32 public round_number;

    function status() public view returns (Status) {
        return _status;
    }

    function onInit() virtual internal {
        setStatusInitializing();

        loadRelays();
    }

    function onRelaysLoaded() virtual internal {}

    function onConfirm() virtual internal {}
    function onReject() virtual internal {}

    modifier onlyInitializer() {
        require(msg.sender == initializer, ErrorCodes.SENDER_NOT_INITIALIZER);
        _;
    }

    modifier eventNotRejected() {
        require(_status != Status.Rejected, ErrorCodes.WRONG_STATUS);

        _;
    }

    modifier onlyStaking() {
        require(msg.sender == getStakingAddress(), ErrorCodes.SENDER_NOT_STAKING);
        _;
    }

    modifier onlyRelayRound() {
        require(msg.sender == relay_round, ErrorCodes.SENDER_NOT_RELAY_ROUND);
        _;
    }

    modifier eventInitializing() {
        require(_status == Status.Initializing, ErrorCodes.EVENT_NOT_INITIALIZING);
        _;
    }

    modifier eventPending() {
        require(_status == Status.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    function getStakingAddress() virtual internal view returns (address);
    function isExternalVoteCall(uint32 functionId) virtual internal view returns (bool);

    function loadRelays() internal view {
        require(_status == Status.Initializing, ErrorCodes.WRONG_STATUS);

        IStaking(getStakingAddress()).getRelayRoundAddressFromTimestamp{
            value: 1 ton,
            bounce: false,
            callback: BaseEvent.receiveRoundAddress
        }(now);
    }

    // TODO: cant be pure, compiler lies
    function receiveRoundAddress(
        address roundContract,
        uint32 roundNum
    ) external onlyStaking {
        relay_round = roundContract;
        round_number = roundNum;

        IRound(roundContract).relayKeys{
            value: 1 ton,
            bounce: false,
            callback: BaseEvent.receiveRoundRelays
        }();
    }

    function receiveRoundRelays(
        uint[] keys
    ) external onlyRelayRound {
        requiredVotes = uint16(keys.length * 2 / 3) + 1;

        for (uint key: keys) {
            votes[key] = Vote.Empty;
        }

        _status = Status.Pending;

        onRelaysLoaded();
    }

    function setStatusConfirmed() internal {
        require(_status == Status.Pending, ErrorCodes.WRONG_STATUS);

        _status = Status.Confirmed;

        emit Confirmed();
    }

    function setStatusRejected(uint16 reason) internal {
        require(
            _status == Status.Initializing || _status == Status.Pending,
            ErrorCodes.WRONG_STATUS
        );

        _status = Status.Rejected;

        emit Rejected(reason);
    }

    function setStatusInitializing() internal {
        require(_status == Status.Initializing, ErrorCodes.WRONG_STATUS);

        _status = Status.Initializing;
    }

    function _checkVoteReceiver(address voteReceiver) internal pure {
        require(voteReceiver == address(this), ErrorCodes.WRONG_VOTE_RECEIVER);
    }

    /*
        @dev Get voters by the vote type
        @param vote Vote type
        @return voters List of voters (relays) public keys
    */
    function getVoters(Vote vote) public view responsible returns(uint[] voters) {
        for ((uint voter, Vote vote_): votes) {
            if (vote_ == vote) {
                voters.push(voter);
            }
        }

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} voters;
    }

    function getVote(uint256 voter) public view responsible returns(optional(Vote) vote) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} votes.fetch(voter);
    }

    function getApiVersion() external pure responsible returns(uint32) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} 2;
    }
}
