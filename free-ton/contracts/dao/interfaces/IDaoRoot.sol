pragma ton-solidity >= 0.39.0;

import "../structures/ActionStructure.sol";
import "../structures/ProposalConfigurationStructure.sol";
import "../structures/ProposalSates.sol";
import "../structures/PlatformTypes.sol";

interface IDaoRoot is ActionStructure, ProposalConfigurationStructure, ProposalStates, DaoPlatformTypes {
    event EthActions(
        int8 gasBackWid,
        uint256 gasBackAddress,
        uint32 chainId,
        EthActionStripped[] actions
    );
    event ProposalCreated(
        uint32 proposalId,
        address proposer,
        TonAction[] tonActions,
        EthAction[] ethActions,
        string description
    );
    event StakingRootUpdated(address oldRoot, address newRoot);
    event RequestedAdminTransfer(address oldAdmin, address newAdmin);
    event AdminTransferAccepted(address oldAdmin, address newAdmin);
    event EthereumActionEventConfigurationUpdated(
        address oldConfiguration,
        address newConfiguration,
        uint128 oldDeployEventValue,
        uint128 newDeployEventValue
    );
    event ProposalCodeUpgraded(uint16 newVersion);
    event ProposalConfigurationUpdated(ProposalConfiguration oldConfig, ProposalConfiguration newConfig);
    event ProposalVotingDelayUpdated(uint32 oldVotingDelay, uint32 newVotingDelay);
    event ProposalGracePeriodUpdated(uint32 oldGracePeriod, uint32 newGracePeriod);
    event ProposalVotingPeriodUpdated(uint32 oldVotingPeriod, uint32 newVotingPeriod);
    event ProposalThresholdUpdated(uint128 oldThreshold, uint128 newThreshold);
    event ProposalQuorumVotesUpdated(uint128 oldQuorumVotes, uint128 newQuorumVotes);
    event ProposalTimeLockUpdated(uint32 oldTimeLock, uint32 newTimeLock);
    event ExecutingTonActions(uint32 proposalId, TonAction[] tonActions);
    event RootCodeUpgraded();

    function getAdmin() external responsible view returns (address);
    function getPendingAdmin() external responsible view returns (address);
    function getProposalCount() external responsible view returns (uint32);
    function getStakingRoot() external responsible view returns (address);
    function getEthereumActionEventConfiguration() external responsible view returns (address, uint128);

    function expectedProposalAddress(uint32 proposalId) external responsible view returns (address);
    function expectedStakingAccountAddress(address accountOwner) external responsible view returns (address);

    function propose(uint32 answerId, TonAction[] tonActions, EthAction[] ethActions, string description) external;
    function deployProposal(uint32 nonce, address accountOwner, TvmCell proposalData) external;
    function onProposalSucceeded(uint32 proposalId, address proposer, TonAction[] tonActions, EthAction[] ethActions) external;

    function setStakingRoot(address newRoot) external;
    function transferAdmin(address newAdmin) external;
    function acceptAdmin() external;
    function updateEthereumActionEventConfiguration(address ethereumActionEventConfiguration, uint128 newDeployEventValue) external;
    function updateProposalCode(TvmCell code) external;
    function updateProposalConfiguration(ProposalConfiguration newConfig) external;
    function updateVotingDelay(uint32 newVotingDelay) external;
    function updateGracePeriod(uint32 newGracePeriod) external;
    function updateVotingPeriod(uint32 newVotingPeriod) external;
    function updateTimeLock(uint32 newTimeLock) external;
    function updateThreshold(uint128 newThreshold) external;
    function updateQuorumVotes(uint128 newQuorumVotes) external;

    function requestUpgradeProposal(
        uint16 currentVersion,
        address sendGasTo,
        uint32 proposalId
    ) external;

}
