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

    constructor(
        uint relayKey
    ) public {
        require(relayKey > 0);
        tvm.accept();

    }

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
