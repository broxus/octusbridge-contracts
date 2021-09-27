pragma ton-solidity >= 0.39.0;


interface IProposer {
    function onProposalCreated(uint64 answerId, uint32 proposalId) external;
    function onProposalNotCreated(uint64 answerId) external;
}
