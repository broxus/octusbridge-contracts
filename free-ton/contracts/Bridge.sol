pragma solidity >= 0.5.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


contract FreeTonBridge {
    uint initializedEventsCounter;

    constructor() public {
        tvm.accept();
    }

    function deployNewEvent(
//        bytes eventContractAddress,
//        bytes eventABI
    ) public {
        // Create new event contract, derive address from the event's sequential ID
        // Increase sequential ID
        initializedEventsCounter++;
    }

    function getInitializedEventsCounter() public view returns(uint) {
        return initializedEventsCounter;
    }
}
