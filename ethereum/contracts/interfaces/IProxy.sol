pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


interface IProxy {
    struct TONEvent {
        uint eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventIndex;
        bytes eventData;
        bytes tonEventConfiguration;
        uint requiredConfirmations;
        uint requiredRejects;
    }
}
