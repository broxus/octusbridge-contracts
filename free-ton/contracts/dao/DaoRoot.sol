pragma ton-solidity >= 0.39.0;

import "Proposal.sol";

import {PlatformTypes as StakingPlatformTypes} from "../staking/libraries/PlatformTypes.sol";

import "./libraries/Gas.sol";
import "./libraries/DaoErrors.sol";

import "./interfaces/IDaoRoot.sol";
import "./interfaces/IStakingAccount.sol";
import "./interfaces/IProposer.sol";
import "./interfaces/IUpgradable.sol";

import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "../../../node_modules/@broxus/contracts/contracts/platform/Platform.sol";
import "../utils/Delegate.sol";
import "../utils/cell-encoder/CellEncoder.sol";
import "../bridge/interfaces/event-configuration-contracts/ITonEventConfiguration.sol";

contract DaoRoot is CellEncoder, IDaoRoot, IUpgradable, Delegate {
    uint8 public constant proposalMaxOperations = 10;
    uint16 public constant proposalMaxDescriptionLen = 2048;

    //todo: set correct
    uint128 public constant MIN_PROPOSAL_THRESHOLD = 0;
    uint128 public constant MAX_PROPOSAL_THRESHOLD = 10e18;
    uint128 public constant MIN_PROPOSAL_QUORUM = 0;
    uint128 public constant MAX_PROPOSAL_QUORUM = 10e18;
    uint32 public constant MIN_VOTING_PERIOD = 24 hours;
    uint32 public constant MAX_VOTING_PERIOD = 2 weeks;
    uint32 public constant MIN_VOTING_DELAY = 1;
    uint32 public constant MAX_VOTING_DELAY = 7 days;
    uint32 public constant MIN_TIME_LOCK = 1;
    uint32 public constant MAX_TIME_LOCK = 2 weeks;

    uint32 static _nonce;

    address public stakingRoot;
    address public ethereumActionEventConfiguration;
    uint128 public deployEventValue;

    uint32 public proposalCount;
    ProposalConfiguration public proposalConfiguration;

    TvmCell public proposalCode;
    TvmCell public platformCode;

    uint16 public proposalVersion;

    address public admin;
    address public pendingAdmin;

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            checkDelegate();
        }
        _;
    }

    modifier onlyProposal(uint32 proposalId) {
        require(msg.sender == expectedProposalAddress(proposalId), DaoErrors.NOT_PROPOSAL);
        _;
    }

    modifier onlyStakingAccount(address accountOwner) {
        require(msg.sender == expectedStakingAccountAddress(accountOwner), DaoErrors.NOT_ACCOUNT);
        _;
    }

    constructor(
        TvmCell platformCode_,
        ProposalConfiguration proposalConfiguration_,
        address admin_
    ) public {
        tvm.accept();
        platformCode = platformCode_;
        proposalConfiguration = proposalConfiguration_;
        admin = admin_;
    }

    /*******************
    * Getter functions *
    *******************/

    function getAdmin() override public responsible view returns (address) {
         return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} admin;
    }

    function getPendingAdmin() override public responsible view returns (address) {
         return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} pendingAdmin;
    }

    function getProposalCount() override public responsible view returns (uint32) {
         return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} proposalCount;
    }

    function getStakingRoot() override public responsible view returns (address) {
         return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} stakingRoot;
    }

    function getEthereumActionEventConfiguration() override public responsible view returns (address, uint128) {
         return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (ethereumActionEventConfiguration, deployEventValue);
    }

    function expectedProposalAddress(uint32 proposalId) override public responsible view returns (address) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} address(tvm.hash(buildProposalStateInit(proposalId)));
    }

    function expectedStakingAccountAddress(address accountOwner) override public responsible view returns (address) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} address(tvm.hash(buildStakingAccountStateInit(accountOwner)));
    }


    /*********************
    * Proposal functions *
    *********************/

    function propose(
        uint32 answerId,
        TonAction[] tonActions,
        EthAction[] ethActions,
        string description
    ) override public {
        uint actionsAmount = tonActions.length + ethActions.length;
        require(actionsAmount != 0, DaoErrors.ACTIONS_MUST_BE_PROVIDED);
        require(actionsAmount <= proposalMaxOperations, DaoErrors.TOO_MANY_ACTIONS);
        require(bytes(description).length <= proposalMaxDescriptionLen, DaoErrors.DESCRIPTION_TOO_LONG);
        uint128 tonTotalGasValue = calcTonActionsValue(tonActions);
        uint128 ethTotalGasValue = calcEthActionsValue(ethActions);
        require(
            msg.value >= ethTotalGasValue + tonTotalGasValue + Gas.DEPLOY_PROPOSAL_VALUE,
            DaoErrors.MSG_VALUE_TOO_LOW_TO_CREATE_PROPOSAL
        );
        TvmBuilder proposalData;
        proposalData.store(answerId);
        proposalData.store(tonActions);
        proposalData.store(ethActions);
        proposalData.store(description);
        IStakingAccount(expectedStakingAccountAddress(msg.sender)).propose{
            value: 0,
            flag: MsgFlag.REMAINING_GAS
        }(proposalData.toCell(), proposalConfiguration.threshold);
    }

    function deployProposal(
        uint32 nonce,
        address accountOwner,
        TvmCell proposalData
    ) override public onlyStakingAccount(accountOwner){
        tvm.rawReserve(address(this).balance - msg.value, 2);

        (uint32 answerId, TonAction[] tonActions, EthAction[] ethActions, string description)
            = proposalData.toSlice().decodeFunctionParams(propose);

        proposalCount++;
        emit ProposalCreated(proposalCount, accountOwner, tonActions, ethActions, description);
        IStakingAccount(msg.sender).onProposalDeployed{
            value: Gas.PROPOSAL_DEPLOYED_CALLBACK_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES,
            bounce: false
        }(nonce, proposalCount, answerId);
        TvmBuilder params;
        params.store(stakingRoot);
        params.store(accountOwner);
        params.store(description);
        params.store(tonActions);
        params.store(ethActions);
        params.store(proposalConfiguration);
        params.store(proposalVersion);
        new Platform{
            stateInit: buildProposalStateInit(proposalCount),
            value: Gas.DEPLOY_PROPOSAL_VALUE,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(proposalCode, params.toCell(), accountOwner);
    }

    function onProposalSucceeded(
        uint32 proposalId,
        address proposer,
        TonAction[] tonActions,
        EthAction[] ethActions
    ) override public onlyProposal(proposalId) {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        if (tonActions.length > 0) {
            emit ExecutingTonActions(proposalId, tonActions);
            for (uint i = 0; i < tonActions.length; i++) {
                executeTonAction(tonActions[i]);
            }
        }
        if (ethActions.length > 0) {
            executeEthActions(proposer, ethActions);
        }
        Proposal(msg.sender).onActionsExecuted{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}();
    }

    function executeTonAction(TonAction action) private pure inline {
        action.target.transfer({
            value: action.value,
            flag: MsgFlag.SENDER_PAYS_FEES,
            bounce: false,
            body: action.payload
        });
    }

    function executeEthActions(address proposer, EthAction[] actions) private view inline {
        mapping(uint32 => EthActionStripped[]) chainActions;
        for ((EthAction action) : actions) {
            uint32 chainId = action.chainId;
            EthActionStripped actionStripped = EthActionStripped(
                action.value,
                action.target,
                action.signature,
                action.callData
            );
            if(chainActions.exists(chainId)){
                chainActions[chainId].push(actionStripped);
            } else {
                chainActions[chainId] = [actionStripped];
            }
        }
        for ((uint32 chainId, EthActionStripped[] ethActions) : chainActions) {
            TvmCell eventData = encodeDaoEthereumActionData(proposer.wid, proposer.value, chainId, ethActions);
            ITonEvent.TonEventVoteData eventVoteData = ITonEvent.TonEventVoteData(tx.timestamp, now, eventData);
            ITonEventConfiguration(ethereumActionEventConfiguration).deployEvent{
                value: deployEventValue,
                flag: MsgFlag.SENDER_PAYS_FEES,
                bounce: false
            }(eventVoteData);
        }
    }

    function calcTonActionsValue(TonAction[] actions) public pure returns (uint128 totalValue) {
        totalValue = 0;
        for (uint i = 0; i < actions.length; i++) {
            totalValue += (actions[i].value + Gas.EXECUTE_TON_ACTION_VALUE);
        }
    }

    function calcEthActionsValue(
        EthAction[] actions
    ) public view returns (uint128 totalValue) {
        totalValue = 0;
        mapping(uint32 => bool) chains;
        for (uint i = 0; i < actions.length; i++) {
            uint32 chainId = actions[i].chainId;
            if(!chains.exists(chainId)){
                totalValue += deployEventValue;
                chains[chainId] = true;
            }
            totalValue += Gas.EXECUTE_ETH_ACTION_VALUE;
        }
    }

    function buildProposalStateInit(uint32 proposalId) private view returns (TvmCell) {
        return _buildInitData(PlatformType.Proposal, _buildProposalInitialData(proposalId));
    }

    function buildStakingAccountStateInit(address accountOwner) private view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: stakingRoot,
                platformType: StakingPlatformTypes.UserData,
                initialData: _buildStakingAccountInitialData(accountOwner),
                platformCode: platformCode
            },
            pubkey: 0,
            code: platformCode
        });
    }

    function _buildInitData(PlatformType platformType, TvmCell initialData) private view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: address(this),
                platformType: uint8(platformType),
                initialData: initialData,
                platformCode: platformCode
            },
            pubkey: 0,
            code: platformCode
        });
    }

    function _buildStakingAccountInitialData(address accountOwner) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(accountOwner);
        return builder.toCell();
    }

    function _buildProposalInitialData(uint32 proposalId) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(proposalId);
        return builder.toCell();
    }

    function requestUpgradeProposal(
        uint16 currentVersion,
        address sendGasTo,
        uint32 proposalId
    ) override public onlyProposal(proposalId) {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        if (currentVersion == proposalVersion) {
            sendGasTo.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
        } else {
            IUpgradableByRequest(msg.sender).upgrade{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                proposalCode,
                proposalVersion,
                sendGasTo
            );
        }
    }

    /******************
    * Admin functions *
    ******************/

    function setStakingRoot(address newStakingRoot) override public onlyAdmin {
        emit StakingRootUpdated(stakingRoot, newStakingRoot);
        stakingRoot = newStakingRoot;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function transferAdmin(address newAdmin) override public onlyAdmin {
        emit RequestedAdminTransfer(admin, newAdmin);
        pendingAdmin = newAdmin;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function acceptAdmin() override public {
        require(pendingAdmin.value != 0 && msg.sender == pendingAdmin, DaoErrors.NOT_PENDING_ADMIN);
        emit AdminTransferAccepted(admin, pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateEthereumActionEventConfiguration(
        address newConfiguration,
        uint128 newDeployEventValue
    ) override public onlyAdmin {
        emit EthereumActionEventConfigurationUpdated(
            ethereumActionEventConfiguration,
            newConfiguration,
            deployEventValue,
            newDeployEventValue
        );
        ethereumActionEventConfiguration = newConfiguration;
        deployEventValue = newDeployEventValue;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateProposalCode(TvmCell code) override public onlyAdmin {
        proposalCode = code;
        proposalVersion++;
        emit ProposalCodeUpgraded(proposalVersion);
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateQuorumVotes(uint128 newQuorumVotes) override public onlyAdmin {
        require(
            newQuorumVotes >= MIN_PROPOSAL_QUORUM && newQuorumVotes <= MAX_PROPOSAL_QUORUM,
            DaoErrors.WRONG_QUORUM
        );
        emit ProposalQuorumVotesUpdated(proposalConfiguration.quorumVotes, newQuorumVotes);
        proposalConfiguration.quorumVotes = newQuorumVotes;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateThreshold(uint128 newThreshold) override public onlyAdmin {
        require(
            newThreshold >= MIN_PROPOSAL_THRESHOLD && newThreshold <= MAX_PROPOSAL_THRESHOLD,
            DaoErrors.WRONG_THRESHOLD
        );
        emit ProposalThresholdUpdated(proposalConfiguration.threshold, newThreshold);
        proposalConfiguration.threshold = newThreshold;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateTimeLock(uint32 newTimeLock) override public onlyAdmin {
        require(
            newTimeLock >= MIN_TIME_LOCK && newTimeLock <= MAX_TIME_LOCK,
            DaoErrors.WRONG_TIME_LOCK
        );
        emit ProposalTimeLockUpdated(proposalConfiguration.timeLock, newTimeLock);
        proposalConfiguration.timeLock = newTimeLock;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateVotingPeriod(uint32 newVotingPeriod) override public onlyAdmin {
        require(
            newVotingPeriod >= MIN_VOTING_PERIOD && newVotingPeriod <= MAX_VOTING_PERIOD,
            DaoErrors.WRONG_VOTING_PERIOD
        );
        emit ProposalVotingPeriodUpdated(proposalConfiguration.votingPeriod, newVotingPeriod);
        proposalConfiguration.votingPeriod = newVotingPeriod;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateVotingDelay(uint32 newVotingDelay) override public onlyAdmin {
        require(
            newVotingDelay >= MIN_VOTING_DELAY && newVotingDelay <= MAX_VOTING_DELAY,
            DaoErrors.WRONG_VOTING_DELAY
        );
        emit ProposalVotingDelayUpdated(proposalConfiguration.votingDelay, newVotingDelay);
        proposalConfiguration.votingDelay = newVotingDelay;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function updateProposalConfiguration(ProposalConfiguration newConfig) override public onlyAdmin {
        checkProposalConfiguration(newConfig);
        emit ProposalConfigurationUpdated(proposalConfiguration, newConfig);
        proposalConfiguration = newConfig;
        admin.transfer({value: 0, flag: MsgFlag.REMAINING_GAS});
    }

    function checkProposalConfiguration(ProposalConfiguration config) internal pure inline {
        require(
            config.votingPeriod >= MIN_VOTING_PERIOD && config.votingPeriod <= MAX_VOTING_PERIOD,
            DaoErrors.WRONG_VOTING_PERIOD
        );
        require(
            config.votingDelay >= MIN_VOTING_DELAY && config.votingDelay <= MAX_VOTING_DELAY,
            DaoErrors.WRONG_VOTING_DELAY
        );
        require(
            config.timeLock >= MIN_TIME_LOCK && config.timeLock <= MAX_TIME_LOCK,
            DaoErrors.WRONG_TIME_LOCK
        );
        require(
            config.threshold >= MIN_PROPOSAL_THRESHOLD && config.threshold <= MAX_PROPOSAL_THRESHOLD,
            DaoErrors.WRONG_THRESHOLD
        );
        require(
            config.quorumVotes >= MIN_PROPOSAL_QUORUM && config.quorumVotes <= MAX_PROPOSAL_QUORUM,
            DaoErrors.WRONG_QUORUM
        );
    }

    function addDelegate(address addr, uint callHash) public onlyAdmin {
        optional(uint[]) optDelegate = delegators.fetch(addr);
        if (optDelegate.hasValue()) {
            uint[] delegate = optDelegate.get();
            delegate.push(callHash);
            delegators[addr] = delegate;
        } else {
            delegators[addr] = [callHash];
        }
    }

    function upgrade(TvmCell code) override public onlyAdmin {
        require(msg.value > Gas.UPGRADE_ACCOUNT_MIN_VALUE, DaoErrors.VALUE_TOO_LOW);
        tvm.rawReserve(address(this).balance - msg.value, 2);

        emit RootCodeUpgraded();

        TvmBuilder builder;
        TvmBuilder builderAdminData;
        builderAdminData.store(/*address*/ admin);
        builderAdminData.store(/*address*/ pendingAdmin);

        builder.store(/*address*/ stakingRoot);

        builder.store(/*uint32*/ proposalCount);
        builder.store(/*uint16*/ proposalVersion);
        builder.store(/*ProposalConfiguration*/ proposalConfiguration);

        builder.store(builderAdminData.toCell()); //ref 1
        builder.store(proposalCode);              //ref 2
        builder.store(platformCode);              //ref 3

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {}
}
