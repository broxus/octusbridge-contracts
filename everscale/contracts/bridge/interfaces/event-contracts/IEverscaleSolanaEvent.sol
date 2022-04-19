pragma ton-solidity >= 0.39.0;

import "./IBasicEvent.sol";


interface IEverscaleSolanaEvent is IBasicEvent {
    struct EverscaleSolanaEventVoteData {
        uint64 accountSeed;
        TvmCell eventData;
    }

    struct EverscaleSolanaEventInitData {
        EverscaleSolanaEventVoteData voteData;
        address configuration;
        address staking;
    }
}
