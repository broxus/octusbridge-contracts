pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract TonEvent {
    uint static eventTransaction;
    uint static eventIndex;
    TvmCell static eventData;
    uint static eventBlockNumber;
    uint static eventBlock;
    address static tonEventConfiguration;
    uint static requiredConfirmations;
    uint static requiredRejects;

    uint[] confirmKeys;
    bytes[] eventDataSignatures;
    uint[] rejectKeys;

    bool eventConfirmed = false;
    bool eventRejected = false;

    modifier onlyNotConfirmed() {
        require(confirmKeys.length < requiredConfirmations, 602);
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

        confirm(relayKey, eventDataSignature);
    }

    /*
        Confirm event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function confirm(uint relayKey, bytes eventDataSignature) public onlyNotConfirmed {
        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, 404);
        }

        confirmKeys.push(relayKey);
        eventDataSignatures.push(eventDataSignature);

        if (confirmKeys.length >= requiredConfirmations) {
            eventConfirmed = true;
            tonEventConfiguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Reject event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function reject(uint relayKey) public {
        for (uint i=0; i<rejectKeys.length; i++) {
            require(rejectKeys[i] != relayKey, 404);
        }

        rejectKeys.push(relayKey);

        if (rejectKeys.length >= requiredRejects) {
            eventRejected = true;
            tonEventConfiguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Read contract details
        @returns _eventTransaction TON event transaction
        @returns _eventIndex TON event index
        @returns _eventData TON event data
        @returns _eventBlockNumber Event transaction block number
        @returns _eventBlock Event transaction block hash
        @returns _tonEventConfiguration TON event configuration contract
        @returns _confirmKeys List of confirm keys
        @returns _rejectKeys List of reject keys
        @returns _eventDataSignatures List of relay's signatures
        @returns _requiredConfirmations Amount of confirmations to confirm event
        @returns _requiredRejects Amount of rejects to reject event
    */
    function getDetails() public view returns (
        uint _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData,
        uint _eventBlockNumber,
        uint _eventBlock,
        address _tonEventConfiguration,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bytes[] _eventDataSignatures,
        uint _requiredConfirmations,
        uint _requiredRejects
    ) {
        return (
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            tonEventConfiguration,
            confirmKeys,
            rejectKeys,
            eventDataSignatures,
            requiredConfirmations,
            requiredRejects
        );
    }
}
