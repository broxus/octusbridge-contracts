pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


interface IProxy {
    struct TONEvent {
        uint eventTransaction;
        uint eventIndex;
        bytes eventData;
        uint eventBlockNumber;
        uint eventBlock;
        bytes tonEventConfiguration;
        uint requiredConfirmations;
        uint requiredRejects;
    }
}
