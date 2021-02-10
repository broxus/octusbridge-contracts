pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import "./../interfaces/IEvent.sol";
import "./../interfaces/IEventNotificationReceiver.sol";

import "../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../additional/CellEncoder.sol";


contract TonEvent is IEvent, ErrorCodes, TransferUtils, CellEncoder {
    TonEventInitData static initData;

    address[] confirmRelays;
    bytes[] eventDataSignatures;
    address[] rejectRelays;

    TonEventStatus status;

    modifier eventInProcess() {
        require(status == TonEventStatus.InProcess, EVENT_NOT_IN_PROGRESS);
        _;
    }

    modifier onlyEventConfiguration(address configuration) {
        require(msg.sender == configuration, SENDER_NOT_EVENT_CONFIGURATION);
        _;
    }

    /*
        Notify specific contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
    */
    function notifyEventStatusChanged() internal view {
        (,,,,,address owner_address) = getDecodedData();

        // TODO: discuss minimum value of the notification
        if (owner_address.value != 0) {
            IEventNotificationReceiver(owner_address).notifyTonEventStatusChanged{value: 0.0001 ton}(status);
        }
    }

    /*
        TON-Ethereum event instance. Collects confirmations and signatures.
        @dev Should be deployed only by TonEventConfiguration contract
        @param relay Public key of the relay, who initiated the event creation
        @param eventDataSignature Relay's signed payload for Ethereum contract
    */
    constructor(
        address relay,
        bytes eventDataSignature
    ) public {
        initData.tonEventConfiguration = msg.sender;
        status = TonEventStatus.InProcess;

        notifyEventStatusChanged();

        confirm(relay, eventDataSignature);
    }

    /*
        Confirm event instance.
        @dev Should be called by TonEventConfiguration
        @param relay Public key of the relay, who initiated the config creation
        @param eventDataSignature Signature of the data to be passed in Ethereum (made with Ethereum public key)
    */
    function confirm(
        address relay,
        bytes eventDataSignature
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventInProcess
    {
        for (uint i=0; i<confirmRelays.length; i++) {
            require(confirmRelays[i] != relay, KEY_ALREADY_CONFIRMED);
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
        Reject event instance.
        @dev Should be called by TonEventConfiguration
        @param relay Public key of the relay, who initiated the config creation
    */
    function reject(
        address relay
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventInProcess
    {
        for (uint i=0; i<rejectRelays.length; i++) {
            require(rejectRelays[i] != relay, KEY_ALREADY_REJECTED);
        }

        rejectRelays.push(relay);

        if (rejectRelays.length >= initData.requiredRejects) {
            status = TonEventStatus.Rejected;

            notifyEventStatusChanged();
            transferAll(initData.tonEventConfiguration);
        }
    }

    /*
        Read contract details
        @return initData Initial data
        @returns _status Current event status
        @returns _confirmRelays List of confirm keys
        @returns _rejectRelays List of reject keys
        @returns _eventDataSignatures List of relay's signatures
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
