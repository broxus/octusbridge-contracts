pragma ton-solidity >= 0.39.0;


interface IVoter {
    function onVoteCasted(uint32 proposalId) external;
    function onVoteRejected(uint32 proposalId, uint16 reason) external;

    function onVotesUnlocked(uint32 proposalId) external;
    function onVotesNotUnlocked(uint32 proposalId, uint16 reason) external;

    function onCastedVoteUnlocked(uint32 proposalId) external;
    function onCastedVoteNotUnlocked(uint32[] proposalIds, uint16 reason) external;
}
