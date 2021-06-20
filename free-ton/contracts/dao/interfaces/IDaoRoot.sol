pragma ton -solidity ^0.39.0;

import "../structures/ActionStructure.sol";
import "../structures/ProposalConfigurationStructure.sol";
import "../structures/ProposalSates.sol";
import "../structures/PlatformTypes.sol";

interface IDaoRoot is ActionStructure, ProposalConfigurationStructure, ProposalStates, DaoPlatformTypes {
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
    event EthExecutorUpdated(uint160 oldExecutor, uint160 newExecutor);
    event ProposalCodeUpgraded(uint16 newVersion);
    event ProposalConfigurationUpdated(ProposalConfiguration oldConfig, ProposalConfiguration newConfig);
    event ExecutingTonActions(uint32 proposalId, TonAction[] tonActions);
    event ExecutingEthActions(uint32 proposalId, EthAction[] ethActions, uint160 ethExecutor);
    event RootCodeUpgraded();

    function getAdmin() external responsible view returns (address);
    function getPendingAdmin() external responsible view returns (address);
    function getProposalCount() external responsible view returns (uint32);
    function getStakingRoot() external responsible view returns (address);

    function expectedProposalAddress(uint32 proposalId) external responsible view returns (address);
    function expectedStakingAccountAddress(address accountOwner) external responsible view returns (address);

    function propose(uint32 answerId, TonAction[] tonActions, EthAction[] ethActions, string description) external;
    function deployProposal(uint32 nonce, address accountOwner, TvmCell proposalData) external;
    function onProposalSucceeded(uint32 proposalId, TonAction[] tonActions, EthAction[] ethActions) external;

    function setStakingRoot(address newRoot) external;
    function transferAdmin(address newAdmin) external;
    function acceptAdmin() external;
    function updateEthExecutor(uint160 newEthExecutor) external;
    function updateProposalCode(TvmCell code) external;
    function updateProposalConfiguration(ProposalConfiguration newConfig) external;

    function requestUpgradeProposal(
        uint16 currentVersion,
        address sendGasTo,
        uint32 proposalId
    ) external;

}
