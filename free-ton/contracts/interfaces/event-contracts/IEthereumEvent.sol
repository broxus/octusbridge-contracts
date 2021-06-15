pragma ton-solidity ^0.39.0;

import "./IBasicEvent.sol";


interface IEthereumEvent is IBasicEvent {
    struct EthereumEventVoteData {
        uint eventTransaction;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 eventBlockNumber;
        uint eventBlock;
        uint32 round;
    }

    struct EthereumEventInitData {
        EthereumEventVoteData voteData;
        address configuration;
        TvmCell meta;
        address staking;
    }
}
