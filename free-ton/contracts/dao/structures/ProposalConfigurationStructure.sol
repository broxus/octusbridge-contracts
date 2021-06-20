pragma ton-solidity ^0.39.0;

interface ProposalConfigurationStructure {
    struct ProposalConfiguration {
        uint32 votingDelay;
        uint32 votingPeriod;
        uint16 quorumVotes;
        uint32 timeLock;
        uint16 threshold;
        uint32 gracePeriod;
    }
}
