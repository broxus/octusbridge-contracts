pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./../interfaces/IEvent.sol";
import "./../interfaces/IEventNotificationReceiver.sol";

import "./../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../utils/cell-encoder/CellEncoder.sol";

import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of TON event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract TonEvent is IEvent, TransferUtils, CellEncoder {
    TonEventInitData static initData;
    TonEventStatus public status;

    mapping (address => Vote) votes;
    mapping (address => bytes) signatures;

    modifier eventPending() {
        require(status == TonEventStatus.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    modifier onlyEventConfiguration() {
        require(
            msg.sender == initData.tonEventConfiguration,
            ErrorCodes.SENDER_NOT_EVENT_CONFIGURATION
        );

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
        @param relay Public key of the relay, who initiated the event creation
    */
    constructor(
        address relay,
        bytes signature
    ) public {
        initData.tonEventConfiguration = msg.sender;
        status = TonEventStatus.Pending;

        notifyEventStatusChanged();

        confirm(relay, signature);
    }

    /*
        @notice Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param relay Relay, who initialized the confirmation
        @param eventDataSignature Relay's signature of the TonEvent data
    */
    function confirm(
        address relay,
        bytes signature
    )
        public
        onlyEventConfiguration
        eventPending
    {
        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Confirm;
        signatures[relay] = signature;

        address[] confirms = getVoters(Vote.Confirm);

        if (confirms.length >= initData.requiredConfirmations) {
            status = TonEventStatus.Confirmed;

            notifyEventStatusChanged();
            transferAll(initData.tonEventConfiguration);
        }
    }

/*
        @notice Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param relay Relay, who initialized the confirmation
    */
    function reject(
        address relay
    )
        public
        onlyEventConfiguration
        eventPending
    {
        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Reject;

        address[] rejects = getVoters(Vote.Reject);

        if (rejects.length >= initData.requiredRejects) {
            status = TonEventStatus.Rejected;

            notifyEventStatusChanged();
            transferAll(initData.tonEventConfiguration);
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
        TonEventInitData _initData,
        TonEventStatus _status,
        address[] confirms,
        address[] rejects,
        bytes[] _signatures,
        uint128 balance
    ) {
        confirms = getVoters(Vote.Confirm);

        for (address voter : confirms) {
            _signatures.push(signatures[voter]);
        }

        return (
            initData,
            status,
            confirms,
            getVoters(Vote.Reject),
            _signatures,
            address(this).balance
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
        (rootToken) = decodeConfigurationMeta(initData.configurationMeta);

        (
            wid,
            addr,
            tokens,
            ethereum_address
        ) = decodeTonEventData(initData.eventData);

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
            IEventNotificationReceiver(owner_address).notifyTonEventStatusChanged{
                flag: 0,
                bounce: false
            }(status);
        }
    }
}
