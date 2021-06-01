pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./../interfaces/IEvent.sol";
import "./../interfaces/IEventNotificationReceiver.sol";

import "./../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../utils/cell-encoder/CellEncoder.sol";


/*
    @title Basic example of TON event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract TonEvent is IEvent, TransferUtils, CellEncoder {
    TonEventInitData static initData;

    address[] confirmRelays;
    bytes[] eventDataSignatures;
    address[] rejectRelays;

    TonEventStatus status;

    modifier eventPending() {
        require(status == TonEventStatus.Pending, ErrorCodes.EVENT_NOT_IN_PROGRESS);
        _;
    }

    modifier onlyEventConfiguration(address configuration) {
        require(msg.sender == configuration, ErrorCodes.SENDER_NOT_EVENT_CONFIGURATION);
        _;
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

    /*
        @dev Should be deployed only by TonEventConfiguration contract
        @param relay Public key of the relay, who initiated the event creation
    */
    constructor(
        address relay,
        bytes eventDataSignature
    ) public {
        initData.tonEventConfiguration = msg.sender;
        status = TonEventStatus.Pending;

        notifyEventStatusChanged();

        confirm(relay, eventDataSignature);
    }

    /*
        @notice Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in inProcess status
        @param relay Relay, who initialized the confirmation
        @param eventDataSignature Relay's signature of the TonEvent data
    */
    function confirm(
        address relay,
        bytes eventDataSignature
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventPending
    {
        for (uint i=0; i<confirmRelays.length; i++) {
            require(confirmRelays[i] != relay, ErrorCodes.KEY_ALREADY_CONFIRMED);
        }

        confirmRelays.push(relay);
        eventDataSignatures.push(eventDataSignature);

        if (confirmRelays.length >= initData.requiredConfirmations) {
            status = TonEventStatus.Confirmed;

            notifyEventStatusChanged();
            transferAll(initData.tonEventConfiguration);
        }
    }

/*
        @notice Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in inProcess status
        @param relay Relay, who initialized the confirmation
    */
    function reject(
        address relay
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventPending
    {
        for (uint i=0; i<rejectRelays.length; i++) {
            require(rejectRelays[i] != relay, ErrorCodes.KEY_ALREADY_REJECTED);
        }

        rejectRelays.push(relay);

        if (rejectRelays.length >= initData.requiredRejects) {
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
        address[] _confirmRelays,
        address[] _rejectRelays,
        bytes[] _eventDataSignatures
    ) {
        return (
            initData,
            status,
            confirmRelays,
            rejectRelays,
            eventDataSignatures
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
}
