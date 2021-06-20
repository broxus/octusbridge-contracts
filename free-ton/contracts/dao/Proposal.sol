pragma ton -solidity ^0.39.0;

import "./interfaces/IProposal.sol";
import "./interfaces/IDaoRoot.sol";
import "./interfaces/IDaoAccount.sol";
import "./interfaces/IUpgradableByRequest.sol";

import "./libraries/DaoErrors.sol";
import "./libraries/Gas.sol";

import "./structures/PlatformTypes.sol";

import {PlatformTypes as StakingPlatformTypes} from "../staking/libraries/PlatformTypes.sol";

import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "../../../node_modules/@broxus/contracts/contracts/platform/Platform.sol";
import "../../../node_modules/@broxus/contracts/contracts/platform/PlatformBase.sol";

contract Proposal is IProposal, IUpgradableByRequest, PlatformBase, DaoPlatformTypes {
    uint32 public /*static */ id;

    address public stakingRoot;

    address public proposer;
    TonAction[] public tonActions;
    EthAction[] public ethActions;
    uint16 public proposalVersion;
    ProposalConfiguration public config;
    uint32 public startTime;
    uint32 public endTime;
    uint32 public executionTime;
    bool public canceled;
    bool public executed;

    uint128 public forVotes;
    uint128 public againstVotes;

    modifier onlyStakingAccount(address accountOwner) {
        require(msg.sender == expectedAccountAddress(accountOwner), DaoErrors.NOT_ACCOUNT);
        _;
    }
    /*******************
    * Getter functions *
    *******************/

    function getProposer() override public view responsible returns (address) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} proposer;
    }

    function getActions() override public view responsible returns (TonAction[], EthAction[]) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (tonActions, ethActions);
    }

    function getConfig() override public view responsible returns (ProposalConfiguration) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} config;
    }

    function getTimings() override public view responsible returns (uint32, uint32, uint32) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (startTime, endTime, executionTime);
    }

    function getVotes() override public view responsible returns (uint128, uint128, uint128) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (forVotes, againstVotes, config.quorumVotes);
    }

    function getStatuses() override public view responsible returns (bool, bool) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (canceled, executed);
    }

    function getState() override public view responsible returns (ProposalState) {
        return{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} state();
    }

    function queue() override public {
        require(state() == ProposalState.Succeeded, DaoErrors.PROPOSAL_IS_NOT_SUCCEEDED);
        tvm.accept();
        executionTime = endTime + config.timeLock;
        emit Queued(executionTime);
        IDaoAccount(expectedAccountAddress(proposer)).unlockVoteTokens{
            value: Gas.UNLOCK_VOTE_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(id, true);
    }

    function execute() override public {
        require(state() == ProposalState.Queued, DaoErrors.PROPOSAL_IS_NOT_QUEUED);
        require(now >= executionTime, DaoErrors.EXECUTION_TIME_NOT_COME_YET);
        tvm.accept();
        executed = true;
        emit Executed();
        uint128 value = Gas.EXECUTE_ACTIONS_VALUE + calcTonActionsValue();
        IDaoRoot(root).onProposalSucceeded{value: value, flag: MsgFlag.SENDER_PAYS_FEES}(id, tonActions, ethActions);
    }

    function cancel() override public {
        require(!executed, DaoErrors.PROPOSAL_IS_EXECUTED);
        require(msg.sender == proposer, DaoErrors.NOT_OWNER);
        tvm.rawReserve(Gas.PROPOSAL_INITIAL_BALANCE, 2);
        emit Canceled();
        IDaoAccount(expectedAccountAddress(proposer)).unlockVoteTokens{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(id, true);
    }

    function castVote(
        uint32 /*proposalId*/,
        address voter,
        uint128 votes,
        bool support,
        string reason
    ) override public onlyStakingAccount(voter) {
        if (state() == ProposalState.Active) {
            if (support) {
                forVotes += votes;
            } else {
                againstVotes += votes;
            }
            emit VoteCast(voter, support, votes, reason);
            voter.transfer({value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false});
        } else {
            IDaoAccount(msg.sender).rejectVote{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(id);
        }
    }

    function onActionsExecuted() override public onlyRoot {

    }

    function state() private view returns (ProposalState) {
        if (canceled) {
            return ProposalState.Canceled;
        } else if (executed) {
            return ProposalState.Executed;
        } else if (now <= startTime) {
            return ProposalState.Pending;
        } else if (now <= endTime) {
            return ProposalState.Active;
        } else if (forVotes <= againstVotes || forVotes < config.quorumVotes) {
            return ProposalState.Failed;
        } else if (executionTime == 0) {
            return ProposalState.Succeeded;
        } else if (now > executionTime + config.gracePeriod) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function unlockCastedVote(address accountOwner) override public view onlyStakingAccount(accountOwner) {
        ProposalState currentState = state();
        bool success = currentState != ProposalState.Active;
        IDaoAccount(msg.sender).unlockCastedVote{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(id, success);
    }

    function unlockVoteTokens(address accountOwner) override public view onlyStakingAccount(accountOwner) {
        ProposalState currentState = state();
        bool success = (
            accountOwner == proposer &&
            currentState != ProposalState.Pending &&
            currentState != ProposalState.Active
        );
        IDaoAccount(msg.sender).unlockVoteTokens{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(id, success);
    }

    function calcTonActionsValue() private view inline returns (uint128 totalValue) {
        totalValue = 0;
        for (uint i = 0; i < tonActions.length; i++) {
            totalValue += tonActions[i].value;
        }
    }

    function expectedAccountAddress(address accountOwner) private view returns (address) {
        return address(tvm.hash(_buildStakingInitData(StakingPlatformTypes.UserData, _buildAccountInitialData(accountOwner))));
    }

    function _buildAccountInitialData(address accountOwner) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(accountOwner);
        return builder.toCell();
    }

    function _buildStakingInitData(uint8 platformType, TvmCell initialData) private inline view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: stakingRoot,
                platformType: platformType,
                initialData: initialData,
                platformCode: platformCode
            },
            pubkey: 0,
            code: platformCode
        });
    }

    function initialParams(
        address stakingRoot_,
        address proposer_,
        TonAction[] tonActions_,
        EthAction[] ethActions_,
        ProposalConfiguration config_,
        uint16 proposalVersion_
    ) public pure {}

    function onCodeUpgrade(TvmCell data) private {
        tvm.resetStorage();
        TvmSlice s = data.toSlice();
        (root, /*type*/, /*sendGasTo*/) = s.decode(address, uint8, address);

        platformCode = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        id = initialData.decode(uint32);

        TvmSlice params = s.loadRefAsSlice();
        (stakingRoot, proposer, tonActions, ethActions, config, proposalVersion)
            = params.decodeFunctionParams(initialParams);
        startTime = now + config.votingDelay;
        endTime = startTime + config.votingPeriod;
    }

    /********************
    * Upgrade functions *
    ********************/

    function requestUpgrade(address sendGasTo) override public view {
        require(msg.sender == proposer, DaoErrors.NOT_OWNER);
        require(msg.value >= Gas.UPGRADE_PROPOSAL_MIN_VALUE, DaoErrors.VALUE_TOO_LOW);
        tvm.rawReserve(Gas.ACCOUNT_INITIAL_BALANCE, 2);
        emit CodeUpgradeRequested(proposalVersion);
        IDaoRoot(root).requestUpgradeProposal{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(proposalVersion, sendGasTo, id);
    }

    function upgrade(TvmCell code, uint16 newVersion, address sendGasTo) override public onlyRoot {
        if (proposalVersion == newVersion) {
            sendGasTo.transfer({value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false});
        } else {
            emit ProposalCodeUpgraded(newVersion);

            TvmBuilder mainData;

            mainData.store(/*address*/ root);
            mainData.store(/*address*/ proposer);
            mainData.store(/*uint32*/ id);

            mainData.store(/*TonAction[]*/ tonActions); // ref1
            mainData.store(/*EthAction[]*/ ethActions); // ref2

            TvmBuilder stateData;
            stateData.store(/*ProposalConfiguration*/ config);
            stateData.store(/*uint32*/ startTime);
            stateData.store(/*endTime*/ endTime);
            stateData.store(/*executionTime*/ executionTime);
            stateData.store(/*bool*/ canceled);
            stateData.store(/*bool*/ executed);
            stateData.store(/*uint128*/ forVotes);
            stateData.store(/*uint128*/ againstVotes);

            mainData.storeRef(stateData);

            tvm.setcode(code);

            tvm.setCurrentCode(code);
            onCodeUpgrade(mainData.toCell());
        }}
}
