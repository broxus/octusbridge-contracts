pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import "./../interfaces/IEvent.sol";
import "../utils/ErrorCodes.sol";


contract TonEvent is IEvent, ErrorCodes {
    TonEventInitData static initData;

    address[] confirmRelays;
    bytes[] eventDataSignatures;
    address[] rejectRelays;

    enum Status { InProcess, Confirmed, Rejected }
    Status status;

    modifier eventInProcess() {
        require(status == Status.InProcess, EVENT_NOT_IN_PROGRESS);
        _;
    }

    modifier onlyEventConfiguration(address configuration) {
        require(msg.sender == configuration, SENDER_NOT_EVENT_CONFIGURATION);
        _;
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
        tvm.accept();

        status = Status.InProcess;

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
            status = Status.Confirmed;

            initData.tonEventConfiguration.transfer({ value: address(this).balance - 0.5 ton });
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
            status = Status.Rejected;

            initData.tonEventConfiguration.transfer({ value: address(this).balance - 0.5 ton });
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
        Status _status,
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
}
