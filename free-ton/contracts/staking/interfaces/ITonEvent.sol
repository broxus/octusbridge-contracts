pragma ton-solidity >= 0.39.0;


interface ITonEvent {
    struct TonEventVoteData {
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        TvmCell eventData;
    }
}
