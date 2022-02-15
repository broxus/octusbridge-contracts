pragma ton-solidity >= 0.39.0;


interface IProposer {
    function onProposalCreated(uint32 answerId, uint32 proposalId) external;
    function onProposalNotCreated(uint32 answerId) external;
}
