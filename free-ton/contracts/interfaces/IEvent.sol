pragma ton-solidity ^0.39.0;

interface IEvent {
    struct TonEventInitData {
        uint eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 round;
        address tonEventConfiguration;
        uint16 requiredConfirmations;
        uint16 requiredRejects;
        TvmCell configurationMeta;
    }

    // for confirming/rejecting TON event
    struct TonEventVoteData {
        uint eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 round;
    }

    struct EthereumEventInitData {
        uint eventTransaction;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 eventBlockNumber;
        uint eventBlock;
        uint32 round;
        address ethereumEventConfiguration;
        uint16 requiredConfirmations;
        uint16 requiredRejects;
        address proxyAddress;
        TvmCell configurationMeta;
    }

    // for confirming/rejecting ETH event
    struct EthereumEventVoteData {
        uint eventTransaction;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 eventBlockNumber;
        uint eventBlock;
        uint32 round;
    }

    enum Vote { Empty, Confirm, Reject }
    enum EthereumEventStatus { Pending, Confirmed, Executed, Rejected }
    enum TonEventStatus { Pending, Confirmed, Rejected }
}

