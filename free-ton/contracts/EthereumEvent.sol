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

    uint confirmations = 0;

    /*
        Ethereum-TON event instance. Collects confirmations and than execute the Proxy callback.
        @dev Should be deployed only by EthereumEventConfiguration contract
        @param relayKey Public key of the relay, who initiated the event creation
    */
    constructor(
        uint relayKey
    ) public {
        require(relayKey > 0);
        tvm.accept();
    }

    /*
        Confirm event instance.
        @dev Should be called by Bridge -> EthereumEventConfiguration
        @param relayKey Public key of the relay, who initiated the config creation
    */
    function confirm(uint relayKey) public {
        require(relayKey > 0);
        confirmations++;
        proxyCallbackExecuted = true;

        Proxy(proxyAddress).broxusBridgeCallback(
            eventTransaction,
            eventIndex,
            eventData
        );
    }

    function getDetails() public view returns (
        bool _proxyCallbackExecuted,
        uint _confirmations
    ) {
        tvm.accept();

        return (
            proxyCallbackExecuted,
            confirmations
        );
    }
}
