pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../interfaces/IEventNotificationReceiver.sol";
import "./../interfaces/event-contracts/ITonEvent.sol";

import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";

import "./../../utils/ErrorCodes.sol";
import "./../../utils/TransferUtils.sol";
import "./../../utils/cell-encoder/CellEncoder.sol";

import './../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


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
    mapping (uint => Vote) public votes;
    // Ethereum payload signatures for confirmations
    mapping (uint => bytes) public signatures;
    // Event contract deployer
    address public initializer;
    // Event configuration meta
    TvmCell public meta;
    // How many votes required for confirm / reject
    uint32 public requiredVotes;

    modifier onlyStaking() {
        require(msg.sender == eventInitData.staking, ErrorCodes.SENDER_NOT_STAKING);
        _;
    }

    modifier onlyInitializer() {
        require(msg.sender == initializer, ErrorCodes.SENDER_NOT_INITIALIZER);
        _;
    }

    modifier eventInitializing() {
        require(status == Status.Initializing, ErrorCodes.EVENT_NOT_INITIALIZING);
        _;
    }

    modifier eventNotPending() {
        require(status != Status.Pending, ErrorCodes.EVENT_PENDING);
        _;
    }

    function close() public view onlyInitializer eventNotPending {
        transferAll(initializer);
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

        notifyEventStatusChanged();

        IStaking(eventInitData.staking).getRelayRoundAddressFromTimestamp{
            value: 1 ton,
            callback: TonEvent.receiveRoundAddress
        }(now);
    }

    function receiveRoundAddress(
        address roundContract
    ) public onlyStaking eventInitializing {
        IRound(roundContract).relayKeys{
            value: 1 ton,
            callback: TonEvent.receiveRoundRelays
        }();
    }

    function receiveRoundRelays(
        uint[] keys
    ) public onlyStaking eventInitializing {
        requiredVotes = uint16(keys.length * 2 / 3) + 1;

        for (uint key: keys) {
            votes[key] = Vote.Empty;
        }

        status = Status.Pending;
    }

    /*
        @dev Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param eventDataSignature Relay's signature of the TonEvent data
    */
    function confirm(bytes signature) public {
        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;
        signatures[relay] = signature;

        emit Confirm(relay, signature);

        // Event already confirmed
        if (status != Status.Pending) {
            return;
        }

        if (getVoters(Vote.Confirm).length >= requiredVotes) {
            status = Status.Confirmed;

            notifyEventStatusChanged();
        }
    }

    /*
        @dev Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
    */
    function reject() public {
        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Reject;

        emit Reject(relay);

        // Event already confirmed
        if (status != Status.Pending) {
            return;
        }

        if (getVoters(Vote.Reject).length >= requiredVotes) {
            status = Status.Rejected;

            notifyEventStatusChanged();
        }
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
        TonEventInitData _eventInitData,
        Status _status,
        uint[] confirms,
        uint[] rejects,
        uint[] empty,
        bytes[] _signatures,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        confirms = getVoters(Vote.Confirm);

        for (uint voter : confirms) {
            _signatures.push(signatures[voter]);
        }

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status,
            confirms,
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
        address rootToken,
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint160 ethereum_address,
        address owner_address
    ) {
        (rootToken) = decodeConfigurationMeta(meta);

        (
            wid,
            addr,
            tokens,
            ethereum_address
        ) = decodeTonEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, addr);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            rootToken,
            wid,
            addr,
            tokens,
            ethereum_address,
            owner_address
        );
    }

    /*
        @dev Notify owner contract that event contract status has been changed
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
