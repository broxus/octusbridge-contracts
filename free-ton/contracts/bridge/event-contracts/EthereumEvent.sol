pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../interfaces/IEventNotificationReceiver.sol";
import "./../interfaces/event-contracts/IEthereumEvent.sol";
import "./../interfaces/IProxy.sol";

import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";

import "./../../utils/ErrorCodes.sol";
import "./../../utils/TransferUtils.sol";
import "./../../utils/cell-encoder/CellEncoder.sol";

import './../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Basic example of Ethereum event configuration
/// @dev Anyone can deploy it for specific event. Relays send their
/// rejects / confirms with external message directly into this contract.
/// In case enough confirmations is collected - callback is executed.
/// This implementation is used for cross chain token transfers
contract EthereumEvent is IEthereumEvent, TransferUtils, CellEncoder {
    // Event data
    EthereumEventInitData static eventInitData;
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

    modifier eventPending() {
        require(status == Status.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    modifier eventInitializing() {
        require(status == Status.Initializing, ErrorCodes.EVENT_NOT_INITIALIZING);
        _;
    }

    modifier onlyStaking() {
        require(msg.sender == eventInitData.staking, ErrorCodes.SENDER_NOT_STAKING);
        _;
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

    /// @dev Should be deployed only by corresponding EthereumEventConfiguration contract
    /// @param _initializer The address who paid for contract deployment.
    /// Receives all contract balance at the end of event contract lifecycle.
    constructor(
        address _initializer,
        TvmCell _meta
    ) public {
        // TODO: add external method for executing confirmed event?
        eventInitData.configuration = msg.sender;

        status = Status.Initializing;
        initializer = _initializer;
        meta = _meta;

        notifyEventStatusChanged();

        IStaking(eventInitData.staking).getRelayRoundAddressFromTimestamp{
            value: 1 ton,
            callback: EthereumEvent.receiveRoundAddress
        }(now);
    }

    // TODO: cant be pure, compiler lies
    function receiveRoundAddress(
        address roundContract
    ) public onlyStaking eventInitializing {
        IRound(roundContract).relayKeys{
            value: 1 ton,
            callback: EthereumEvent.receiveRoundRelays
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

    /// @dev Confirm event. Can be called only by relay which is in charge at this round.
    /// Can be called only when event configuration is in Pending status
    function confirm() public eventPending {
        uint relay = msg.pubkey();

        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);

        tvm.accept();

        votes[relay] = Vote.Confirm;

        emit Confirm(relay);

        if (getVoters(Vote.Confirm).length >= requiredVotes) {
            status = Status.Confirmed;

            notifyEventStatusChanged();

            IProxy(eventInitData.configuration).broxusBridgeCallback{
                flag: MsgFlag.ALL_NOT_RESERVED
            }(eventInitData, initializer);
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

        emit Reject(relay);

        if (getVoters(Vote.Reject).length >= requiredVotes) {
            status = Status.Rejected;

            notifyEventStatusChanged();
            transferAll(initializer);
        }
    }

    /// @dev Get event details
    /// @return _eventInitData Init data
    /// @return _status Current event status
    /// @return confirms List of relays who have confirmed event
    /// @return rejects List of relays who have rejected event
    /// @return empty List of relays who have not voted
    /// @return balance This contract's balance
    /// @return _initializer Account who has deployed this contract
    /// @return _meta Meta data from the corresponding event configuration
    /// @return _requiredVotes The required amount of votes to confirm / reject event.
    /// Basically it's 2/3 + 1 relays for this round
    function getDetails() public view responsible returns (
        EthereumEventInitData _eventInitData,
        Status _status,
        uint[] confirms,
        uint[] rejects,
        uint[] empty,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status,
            getVoters(Vote.Confirm),
            getVoters(Vote.Reject),
            getVoters(Vote.Empty),
            address(this).balance,
            initializer,
            meta,
            requiredVotes
        );
    }

    /*
        @dev Get decoded event data
        @returns rootToken Token root contract address
        @returns tokens How much tokens to mint
        @returns wid Tokens receiver address workchain ID
        @returns owner_addr Token receiver address body
        @returns owner_pubkey Token receiver public key
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view responsible returns (
        address rootToken,
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey,
        address owner_address
    ) {
        (rootToken) = decodeConfigurationMeta(meta);

        (
            tokens,
            wid,
            owner_addr,
            owner_pubkey
        ) = decodeEthereumEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, owner_addr);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            rootToken,
            tokens,
            wid,
            owner_addr,
            owner_pubkey,
            owner_address
        );
    }

    /// @dev Notify owner contract that event contract status has been changed
    /// @dev In this example, notification receiver is derived from the configuration meta
    /// @dev Used to easily collect all confirmed events by user's wallet
    function notifyEventStatusChanged() internal view {
        (,,,,,address owner_address) = getDecodedData();

        if (owner_address.value != 0) {
            IEventNotificationReceiver(owner_address)
                .notifyEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }
}
