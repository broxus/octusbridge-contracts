pragma solidity >= 0.6.0;
pragma AbiHeader expire;


interface Proxy {
    function broxusBridgeCallback(
        bytes eventTransaction,
        uint eventIndex,
        TvmCell eventData
    ) external;
}


contract EthereumEvent {
    bytes static eventTransaction;
    uint static eventIndex;
    TvmCell static eventData;
    address static proxyAddress;
    address static ethereumEventConfirguration;

    bool proxyCallbackExecuted = false;

    uint requiredConfirmations;

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
        @param requiredConfirmations Required confirmations to execute event
        @param relayKey Public key of the relay, who initiated the event creation
    */
    constructor(
        uint relayKey,
        uint _requiredConfirmations
    ) public {
        tvm.accept();

        requiredConfirmations = _requiredConfirmations;
        confirm(relayKey);
    }

    /*
        Confirm event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function confirm(uint relayKey) public onlyNotExecuted {
        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, 404);
        }

        confirmKeys.push(relayKey);

        if (confirmKeys.length >= requiredConfirmations) {
            _executeProxyCallback();
        }
    }

    /*
        Execute callback on proxy contract
        @dev Called internally, after required amount of confirmations received
    */
    function _executeProxyCallback() internal {
        proxyCallbackExecuted = true;

        Proxy(proxyAddress).broxusBridgeCallback(
            eventTransaction,
            eventIndex,
            eventData
        );
    }

    /*
        Read contract details
        @returns Ethereum event transaction, Ethereum event index,
        Ethereum event data, Proxy contract address, Ethereum event configuration contract,
        proxy callback executed or not, list of confirm keys, list of reject keys
    */
    function getDetails() public view returns (
        bytes _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData,
        address _proxyAddress,
        address _ethereumEventConfirguration,
        bool _proxyCallbackExecuted,
        uint[] _confirmKeys,
        uint[] _rejectKeys
    ) {
        tvm.accept();

        return (
            eventTransaction,
            eventIndex,
            eventData,
            proxyAddress,
            ethereumEventConfirguration,
            proxyCallbackExecuted,
            confirmKeys,
            rejectKeys
        );
    }
}
