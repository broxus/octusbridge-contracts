pragma ton-solidity >= 0.39.0;

import "./IBasicEvent.sol";


interface ISolanaEverscaleEvent {
    struct SolanaEverscaleEventVoteData {
        uint accountSeed;
        TvmCell eventData;
    }

    struct SolanaEverscaleEventInitData {
        SolanaEverscaleEventVoteData voteData;
        address configuration;
        address staking;
    }
}
