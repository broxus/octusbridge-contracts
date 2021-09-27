pragma ton-solidity >= 0.39.0;

import 'IDaoRoot.sol';
import "../structures/ActionStructure.sol";
import "../structures/ProposalConfigurationStructure.sol";
import "../structures/ProposalSates.sol";

interface IProposal is ActionStructure, ProposalConfigurationStructure, ProposalStates {

    event VoteCast(address voter, bool support, uint128 votes, string reason);
    event Queued(uint32 executionTime);
    event Executed();
    event Canceled();

    event CodeUpgradeRequested(uint16 currentVersion);
    event ProposalCodeUpgraded(uint16 newVersion);

    function castVote(
        uint32 proposalId,
        address voter,
        uint128 votes,
        bool support,
        string reason
    ) external;

    function getOverview() external view responsible returns (
        address proposer,
        string description,
        uint32 startTime,
        uint32 endTime,
        uint32 executionTime,
        uint128 forVotes,
        uint128 againstVotes,
        uint128 quorumVotes,
        ProposalState state
    );
    function getProposer() external view responsible returns (address);
    function getActions() external view responsible returns (TonAction[], EthAction[]);
    function getConfig() external view responsible returns (ProposalConfiguration);
    function getTimings() external view responsible returns (uint32 startTime, uint32 endTime, uint32 executionTime);
    function getVotes() external view responsible returns (uint128 forVotes, uint128 againstVotes, uint128 quorumVotes);
    function getStatuses() external view responsible returns (bool canceled, bool executed);
    function getState() external view responsible returns (ProposalState);

    function onActionsExecuted() external;

    function execute() external;
    function queue() external;
    function cancel() external;

    function unlockCastedVote(address accountOwner) external view;
    function unlockVoteTokens(address accountOwner) external view;

    function requestUpgrade(address sendGasTo) external view;
}
