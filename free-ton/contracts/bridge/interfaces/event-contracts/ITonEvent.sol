pragma ton-solidity ^0.39.0;

import "./IBasicEvent.sol";


interface ITonEvent is IBasicEvent {
    struct TonEventVoteData {
        uint eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 round;
    }

    struct TonEventInitData {
        TonEventVoteData voteData;
        address configuration;
        TvmCell meta;
        address staking;
    }
}
