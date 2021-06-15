pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./../interfaces/IEventNotificationReceiver.sol";
import "./../interfaces/event-contracts/IEthereumEvent.sol";
import "./../interfaces/IProxy.sol";

import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";

import "./../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../utils/cell-encoder/CellEncoder.sol";

import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of Ethereum event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract EthereumEvent is IEthereumEvent, TransferUtils, CellEncoder {
    // Event data
    EthereumEventInitData static eventInitData;
    // Event contract status
    Status public status;
    // Relays votes
    mapping (address => Vote) public votes;
    // Event contract deployer
    address public initializer;
    // How many votes required for confirm / reject
    uint32 public requiredVotes;

    modifier eventPending() {
        require(status == Status.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    modifier onlyStaking() {
        require(msg.sender == eventInitData.staking, ErrorCodes.SENDER_NOT_STAKING);
        _;
    }

    /*
        @notice Get voters by the vote type
        @param vote Vote type
        @returns voters List of voters (relays) addresses
    */
    function getVoters(Vote vote) public view returns(address[] voters) {
        for ((address voter, Vote vote_): votes) {
            if (vote_ == vote) {
                voters.push(voter);
            }
        }
    }

    /*
        @dev Should be deployed only by EthereumEventConfiguration contract
        @param _initializer The address who paid for contract deployment.
        Receives all contract balance at the end of event contract lifecycle.
    */
    constructor(
        address _initializer
    ) public {
        // TODO: add external method for executing confirmed event?
        eventInitData.configuration = msg.sender;

        status = Status.Pending;
        initializer = _initializer;

        notifyEventStatusChanged();

        IStaking(eventInitData.staking).deriveRoundAddress{
            value: 1 ton,
            callback: EthereumEvent.receiveRoundAddress
        }(eventInitData.voteData.round);
    }

    // TODO: cant be pure, compiler lies
    function receiveRoundAddress(address roundContract) public onlyStaking {
        IRound(roundContract).relays{
            value: 1 ton,
            callback: EthereumEvent.receiveRoundRelays
        }();
    }

    function receiveRoundRelays(address[] relays) public onlyStaking {
        requiredVotes = uint16(relays.length * 2 / 3) + 1;

        for (address relay: relays) {
            votes[relay] = Vote.Empty;
        }
    }

    /*
        @notice Confirm event
        @dev Can be called only by relay
        @dev Can be called only when event configuration is in Pending status
    */
    function confirm() public eventPending {
        address relay = msg.sender;

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Confirm;

        relay.transfer({ value: msg.value });

        if (getVoters(Vote.Confirm).length >= requiredVotes) {
            status = Status.Confirmed;

            notifyEventStatusChanged();

            IProxy(eventInitData.configuration).broxusBridgeCallback{
                flag: MsgFlag.ALL_NOT_RESERVED
            }(eventInitData, initializer);
        }
    }

    /*
        @notice Reject event
        @dev Can be called only by relay
        @dev Can be called only when event configuration is in Pending status
    */
    function reject() public eventPending {
        address relay = msg.sender;

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Reject;

        relay.transfer({ value: msg.value });

        if (getVoters(Vote.Reject).length >= requiredVotes) {
            status = Status.Rejected;

            notifyEventStatusChanged();
            transferAll(initializer);
        }
    }

    /*
        @notice Get event details
        @returns _eventInitData Init data
        @returns _status Current event status
        @returns _confirmRelays List of relays who have confirmed event
        @returns _confirmRelays List of relays who have rejected event
    */
    function getDetails() public view returns (
        EthereumEventInitData _eventInitData,
        Status _status,
        address[] confirms,
        address[] rejects,
        uint128 balance,
        address _initializer,
        uint32 _requiredVotes
    ) {
        return (
            eventInitData,
            status,
            getVoters(Vote.Confirm),
            getVoters(Vote.Reject),
            address(this).balance,
            initializer,
            requiredVotes
        );
    }

    /*
        @notice Get decoded event data
        @returns rootToken Token root contract address
        @returns tokens How much tokens to mint
        @returns wid Tokens receiver address workchain ID
        @returns owner_addr Token receiver address body
        @returns owner_pubkey Token receiver public key
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view returns (
        address rootToken,
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey,
        address owner_address
    ) {
        (rootToken) = decodeConfigurationMeta(eventInitData.meta);

        (
            tokens,
            wid,
            owner_addr,
            owner_pubkey
        ) = decodeEthereumEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, owner_addr);
    }

    /*
        @notice Notify owner contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
        @dev Used to easily collect all confirmed events by user's wallet
    */
    function notifyEventStatusChanged() internal view {
        (,,,,,address owner_address) = getDecodedData();

        if (owner_address.value != 0) {
            IEventNotificationReceiver(owner_address)
                .notifyEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }
}
