pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract EventProxy {
    uint static truffleNonce;

    bool callbackReceived = false;
    bytes eventTransaction;
    uint eventIndex;
    TvmCell eventData;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();
    }

    function broxusBridgeCallback(
        bytes _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData
    ) public {
        callbackReceived = true;
        eventTransaction = _eventTransaction;
        eventIndex = _eventIndex;
        eventData = _eventData;
    }

    function getDetails() public view returns (
        bool _callbackReceived,
        bytes _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData
    ) {
        return (
            callbackReceived,
            eventTransaction,
            eventIndex,
            eventData
        );
    }
}
