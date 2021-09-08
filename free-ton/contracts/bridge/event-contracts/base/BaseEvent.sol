pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../../../utils/ErrorCodes.sol";
import "../../../utils/TransferUtils.sol";
import "../../../utils/cell-encoder/CellEncoder.sol";
import "../../interfaces/IStaking.sol";
import "../../interfaces/IRound.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/IBasicEvent.sol";

import '../../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


abstract contract BaseEvent is IBasicEvent, CellEncoder, TransferUtils{
    // Event contract status
    Status public status;
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

    modifier onlyInitializer() {
        require(msg.sender == initializer, ErrorCodes.SENDER_NOT_INITIALIZER);
        _;
    }

    modifier onlyStaking() {
        require(msg.sender == getStakingAddress(), ErrorCodes.SENDER_NOT_STAKING);
        _;
    }

    modifier eventInitializing() {
        require(status == Status.Initializing, ErrorCodes.EVENT_NOT_INITIALIZING);
        _;
    }

    modifier eventPending() {
        require(status == Status.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    function getStakingAddress() virtual internal view returns (address);
    function isExternalVoteCall(uint32 functionId) virtual internal view returns (bool);

    function loadRelays() internal view {
        IStaking(getStakingAddress()).getRelayRoundAddressFromTimestamp{
            value: 1 ton,
            callback: receiveRoundAddress
        }(now);
    }

    // TODO: cant be pure, compiler lies
    function receiveRoundAddress(address roundContract) public view onlyStaking eventInitializing {
        IRound(roundContract).relayKeys{
            value: 1 ton,
            callback: receiveRoundRelays
        }();
    }

    function receiveRoundRelays(uint[] keys) public onlyStaking eventInitializing {
        requiredVotes = uint16(keys.length * 2 / 3) + 1;

        for (uint key: keys) {
            votes[key] = Vote.Empty;
        }

        status = Status.Pending;
    }

    /*
        @dev Get voters by the vote type
        @param vote Vote type
        @returns voters List of voters (relays) public keys
    */
    function getVoters(Vote vote) public view responsible returns(uint[] voters) {
        for ((uint voter, Vote vote_): votes) {
            if (vote_ == vote) {
                voters.push(voter);
            }
        }

        return {value: 0, flag: MsgFlag.REMAINING_GAS} voters;
    }
}
