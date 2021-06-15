pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./../interfaces/IEventNotificationReceiver.sol";
import "./../interfaces/event-contracts/ITonEvent.sol";

import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";

import "./../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../utils/cell-encoder/CellEncoder.sol";

import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of TON event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract TonEvent is ITonEvent, TransferUtils, CellEncoder {
    // Event data
    TonEventInitData static eventInitData;
    // Event contract status
    Status public status;
    // Relays votes
    mapping (address => Vote) public votes;
    // Ethereum payload signatures for confirmations
    mapping (address => bytes) public signatures;
    // Event contract deployer
    address public initializer;
    // How many votes required for confirm / reject
    uint32 public requiredVotes;

    modifier eventPending() {
        require(status == Status.Pending, ErrorCodes.EVENT_NOT_PENDING);
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
        @dev Should be deployed only by TonEventConfiguration contract
        @param _initializer The address who paid for contract deployment.
        Receives all contract balance at the end of event contract lifecycle.
    */
    constructor(
        address _initializer
    ) public {
        eventInitData.configuration = msg.sender;

        status = Status.Pending;
        initializer = _initializer;

        notifyEventStatusChanged();

        IStaking(eventInitData.staking).deriveRoundAddress{
            value: 1 ton,
            callback: TonEvent.receiveRoundAddress
        }(eventInitData.voteData.round);
    }

    // TODO: only staking
    function receiveRoundAddress(address roundContract) public pure {
        IRound(roundContract).relays{
            value: 1 ton,
            callback: TonEvent.receiveRoundRelays
        }();
    }

    // TODO: only staking
    function receiveRoundRelays(address[] relays) public {
        requiredVotes = uint16(relays.length * 2 / 3) + 1;

        for (address relay: relays) {
            votes[relay] = Vote.Empty;
        }
    }

    /*
        @notice Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param eventDataSignature Relay's signature of the TonEvent data
    */
    function confirm(bytes signature) public eventPending {
        address relay = msg.sender;

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Confirm;
        signatures[relay] = signature;

        if (getVoters(Vote.Confirm).length >= requiredVotes) {
            status = Status.Confirmed;

            notifyEventStatusChanged();
            transferAll(initializer);
        }
    }

    /*
        @notice Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
    */
    function reject() public eventPending {
        // TODO: how much confirm / reject costs for relay?
        address relay = msg.sender;

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Reject;

        if (getVoters(Vote.Reject).length >= requiredVotes) {
            status = Status.Rejected;

            notifyEventStatusChanged();
            transferAll(initializer);
        }
    }

    /*
        @notice Get event details
        @returns _initData Init data
        @returns _status Current event status
        @returns _confirmRelays List of relays who have confirmed event
        @returns _confirmRelays List of relays who have rejected event
        @returns _eventDataSignatures List of relay's TonEvent signatures
    */
    function getDetails() public view returns (
        TonEventInitData _eventInitData,
        Status _status,
        address[] confirms,
        address[] rejects,
        bytes[] _signatures,
        uint128 balance,
        address _initializer,
        uint32 _requiredVotes
    ) {
        confirms = getVoters(Vote.Confirm);

        for (address voter : confirms) {
            _signatures.push(signatures[voter]);
        }

        return (
            eventInitData,
            status,
            confirms,
            getVoters(Vote.Reject),
            _signatures,
            address(this).balance,
            initializer,
            requiredVotes
        );
    }

    /*
        @notice Get decoded event data
        @returns rootToken Token root contract address
        @returns wid Tokens sender address workchain ID
        @returns addr Token sender address body
        @returns tokens How much tokens to mint
        @returns ethereum_address Token receiver Ethereum address
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view returns (
        address rootToken,
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint160 ethereum_address,
        address owner_address
    ) {
        (rootToken) = decodeConfigurationMeta(eventInitData.meta);

        (
            wid,
            addr,
            tokens,
            ethereum_address
        ) = decodeTonEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, addr);
    }

    /*
        @notice Notify owner contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
        @dev Used to easily collect all confirmed events by user's wallet
    */
    function notifyEventStatusChanged() internal view {
        (,,,,,address owner_address) = getDecodedData();

        if (owner_address.value != 0) {
            IEventNotificationReceiver(owner_address).notifyEventStatusChanged{
                flag: 0,
                bounce: false
            }(status);
        }
    }
}
