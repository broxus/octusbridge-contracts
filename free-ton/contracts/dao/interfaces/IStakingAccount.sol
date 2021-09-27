pragma ton-solidity >= 0.39.0;

interface IStakingAccount {
    function propose(TvmCell proposal_data, uint128 threshold) external;
    function onProposalDeployed(uint32 nonce, uint32 proposal_id, uint32 answer_id) external;
    function unlockVoteTokens(uint32 proposal_id, bool success) external;
    function rejectVote(uint32 proposal_id) external;
    function unlockCastedVote(uint32 proposal_id, bool success) external;
}
