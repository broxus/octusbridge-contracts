pragma ton-solidity >= 0.39.0;

import "./IBasicEvent.sol";


interface IEthereumEvent {
    struct EthereumEventVoteData {
        uint eventTransaction;
        uint32 eventIndex;
        TvmCell eventData;
        uint32 eventBlockNumber;
        uint eventBlock;
    }

    struct EthereumEventInitData {
        EthereumEventVoteData voteData;
        address configuration;
        address staking;
        uint32 chainId;
    }
}
