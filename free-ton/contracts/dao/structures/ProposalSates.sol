pragma ton-solidity >= 0.39.0;

interface ProposalStates {
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Failed,
        Succeeded,
        Expired,
        Queued,
        Executed
    }
}
