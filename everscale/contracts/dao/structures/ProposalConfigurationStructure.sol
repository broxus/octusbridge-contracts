pragma ton-solidity >= 0.39.0;

interface ProposalConfigurationStructure {
    struct ProposalConfiguration {
        uint32 votingDelay;
        uint32 votingPeriod;
        uint128 quorumVotes;
        uint32 timeLock;
        uint128 threshold;
        uint32 gracePeriod;
    }
}
