pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import "./../interfaces/Proxy.sol";


contract EthereumEvent {
    uint static eventTransaction;
    uint static eventIndex;
    TvmCell static eventData;
    address static proxyAddress;

    uint static eventBlockNumber;
    uint static eventBlock;

    address static ethereumEventConfirguration;

    uint static requiredConfirmations;
    uint static requiredRejects;


    bool proxyCallbackExecuted = false;
    bool eventRejected = false;

    uint PROXY_CALLBACK_ALREADY_EXECUTED = 501;

    uint[] confirmKeys;
    uint[] rejectKeys;

    modifier onlyNotExecuted() {
        require(proxyCallbackExecuted == false, PROXY_CALLBACK_ALREADY_EXECUTED);
        _;
    }

    /*
        Ethereum-TON event instance. Collects confirmations and than execute the Proxy callback.
        @dev Should be deployed only by EthereumEventConfiguration contract
        @param relayKey Public key of the relay, who initiated the event creation
    */
    constructor(
        uint relayKey
    ) public {
        tvm.accept();

        confirm(relayKey);
    }

    /*
        Confirm event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function confirm(uint relayKey) public onlyNotExecuted {
        require(eventRejected == false, 405);

        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, 404);
        }

        confirmKeys.push(relayKey);

        if (confirmKeys.length >= requiredConfirmations) {
            _executeProxyCallback();
            ethereumEventConfirguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Reject event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function reject(uint relayKey) public onlyNotExecuted {
        for (uint i=0; i<rejectKeys.length; i++) {
            require(rejectKeys[i] != relayKey, 404);
        }

        rejectKeys.push(relayKey);

        if (rejectKeys.length >= requiredRejects) {
            eventRejected = true;
            ethereumEventConfirguration.transfer({ flag: 128, value: 0 });
        }
    }

    /*
        Execute callback on proxy contract
        @dev Called internally, after required amount of confirmations received
    */
    function _executeProxyCallback() internal {
        proxyCallbackExecuted = true;

        Proxy(proxyAddress).broxusBridgeCallback{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData
        );
    }

    /*
        Read contract details
        @returns _eventTransaction Ethereum event transaction
        @returns _eventIndex Ethereum event index
        @returns _eventData Ethereum event data
        @returns _proxyAddress Proxy contract address
        @returns _eventBlockNumber Event transaction block number
        @returns _eventBlock Event transaction block hash
        @returns _ethereumEventConfiguration Ethereum event configuration contract
        @returns _proxyCallbackExecuted Status of the proxy callback
        @returns _eventRejected Status of the event reject
        @returns _confirmKeys List of confirm keys
        @returns _rejectKeys List of reject keys
        @returns _requiredConfirmations Amount of confirmations to confirm event
        @returns _requiredRejects Amount of rejects to reject event
    */
    function getDetails() public view returns (
        uint _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData,
        address _proxyAddress,
        uint _eventBlockNumber,
        uint _eventBlock,
        address _ethereumEventConfirguration,
        bool _proxyCallbackExecuted,
        bool _eventRejected,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        uint _requiredConfirmations,
        uint _requiredRejects
    ) {
        return (
            eventTransaction,
            eventIndex,
            eventData,
            proxyAddress,
            eventBlockNumber,
            eventBlock,
            ethereumEventConfirguration,
            proxyCallbackExecuted,
            eventRejected,
            confirmKeys,
            rejectKeys,
            requiredConfirmations,
            requiredRejects
        );
    }
}
