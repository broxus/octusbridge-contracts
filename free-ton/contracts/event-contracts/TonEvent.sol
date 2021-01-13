pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import "./../interfaces/IEvent.sol";
import "../utils/ErrorCodes.sol";


contract TonEvent is IEvent, ErrorCodes {
    TonEventInitData static initData;

    uint[] confirmKeys;
    bytes[] eventDataSignatures;
    uint[] rejectKeys;

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
        @param relayKey Public key of the relay, who initiated the event creation
        @param eventDataSignature Relay's signed payload for Ethereum contract
    */
    constructor(
        uint relayKey,
        bytes eventDataSignature
    ) public {
        tvm.accept();

        status = Status.InProcess;

        confirm(relayKey, eventDataSignature);
    }

    /*
        Confirm event instance.
        @dev Should be called by TonEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
        @param eventDataSignature Signature of the data to be passed in Ethereum (made with Ethereum public key)
    */
    function confirm(
        uint relayKey,
        bytes eventDataSignature
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventInProcess
    {
        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, KEY_ALREADY_CONFIRMED);
        }

        confirmKeys.push(relayKey);
        eventDataSignatures.push(eventDataSignature);

        if (confirmKeys.length >= initData.requiredConfirmations) {
            status = Status.Confirmed;

            initData.tonEventConfiguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Reject event instance.
        @dev Should be called by TonEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function reject(
        uint relayKey
    )
        public
        onlyEventConfiguration(initData.tonEventConfiguration)
        eventInProcess
    {
        for (uint i=0; i<rejectKeys.length; i++) {
            require(rejectKeys[i] != relayKey, KEY_ALREADY_REJECTED);
        }

        rejectKeys.push(relayKey);

        if (rejectKeys.length >= initData.requiredRejects) {
            status = Status.Rejected;

            initData.tonEventConfiguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Read contract details
        @return initData Initial data
        @returns _status Current event status
        @returns _confirmKeys List of confirm keys
        @returns _rejectKeys List of reject keys
        @returns _eventDataSignatures List of relay's signatures
    */
    function getDetails() public view returns (
        TonEventInitData _initData,
        Status _status,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bytes[] _eventDataSignatures
    ) {
        return (
            initData,
            status,
            confirmKeys,
            rejectKeys,
            eventDataSignatures
        );
    }
}
