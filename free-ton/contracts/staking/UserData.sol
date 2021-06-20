pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./interfaces/IElection.sol";

import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./libraries/PlatformTypes.sol";

import "../dao/structures/PlatformTypes.sol";
import "../dao/interfaces/IDaoRoot.sol";
import "../dao/interfaces/IProposer.sol";
import "../dao/interfaces/IProposal.sol";
import "../dao/interfaces/IVoter.sol";

import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "../../../node_modules/@broxus/contracts/contracts/platform/Platform.sol";

contract UserData is IUserData, IUpgradableByRequest {
    uint16 constant public MAX_REASON_LENGTH = 2048; //todo change

    uint32 public current_version;
    TvmCell public platform_code;

    uint128 public token_balance;
    uint256 public reward_balance;
    uint256 public reward_debt;
    uint128 relay_lock_until;

    address public root; // setup from initialData
    address public user; // setup from initialData

    address public dao_root;
    uint32 _proposal_nonce;

    mapping(uint32 /*proposal_id*/ => uint128 /*locked_value*/) public created_proposals;
    mapping(uint32 /*nonce*/ => uint128 /*locked_value*/) public _tmp_proposals;

    mapping(uint32 /*proposal_id*/ => bool /*support*/) public casted_votes;

    modifier onlyDaoProposal(uint32 proposal_id) {
        require(msg.sender == expectedProposalAddress(proposal_id), StakingErrors.NOT_PROPOSAL);
        _;
    }

    // Cant be deployed directly
    constructor() public { revert(); }

    // ---------------- DAO -------------------

    function lockedTokens() override public view responsible returns(uint128) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} _lockedTokens();
    }

    function canWithdrawVotes() override public view responsible returns (bool) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} _canWithdrawVotes();
    }

    function _canWithdrawVotes() private inline view returns (bool) {
        return (casted_votes.empty() && _tmp_proposals.empty() && created_proposals.empty());
    }

    function propose(
        TvmCell proposal_data,
        uint128 threshold
    ) override public onlyDaoRoot {
        if (token_balance - _lockedTokens() >= threshold) {
            _proposal_nonce++;
            _tmp_proposals[_proposal_nonce] = threshold;
            IDaoRoot(dao_root).deployProposal{
                value: 0,
                flag: MsgFlag.REMAINING_GAS
            }(_proposal_nonce, user, proposal_data);
        } else {
            IProposer(user).onProposalNotCreated{
                value: 0,
                flag: MsgFlag.REMAINING_GAS,
                bounce: false
            }(proposal_data.toSlice().decode(uint64));
        }
    }

    function onProposalDeployed(uint32 nonce, uint32 proposal_id, uint32 answer_id) public override onlyDaoRoot {
        created_proposals[proposal_id] = _tmp_proposals[nonce];
        delete _tmp_proposals[nonce];
        IProposer(user).onProposalCreated{
            value: 0,
            flag: MsgFlag.REMAINING_GAS,
            bounce: false
        }(answer_id, proposal_id);
    }

    function castVote(uint32 proposal_id, bool support) public override onlyUser {
        _castVote(proposal_id, support, '');
    }

    function castVoteWithReason(
        uint32 proposal_id,
        bool support,
        string reason
    ) public override onlyUser {
        _castVote(proposal_id, support, reason);
    }

    function _castVote(uint32 proposal_id, bool support, string reason) private {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
        require(msg.value >= Gas.CAST_VOTE_VALUE, StakingErrors.VALUE_TOO_LOW);
        require(!casted_votes.exists(proposal_id), StakingErrors.ALREADY_VOTED);
        require(bytes(reason).length <= MAX_REASON_LENGTH, StakingErrors.REASON_IS_TOO_LONG);
        emit VoteCast(proposal_id, support, token_balance, reason);
        casted_votes[proposal_id] = support;
        IProposal(expectedProposalAddress(proposal_id)).castVote{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(proposal_id, user, token_balance, support, reason);
    }

    function voteCasted(uint32 proposal_id) override public onlyDaoProposal(proposal_id) {
        IVoter(user).onVoteCasted{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
    }

    function rejectVote(uint32 proposal_id) override public onlyDaoProposal(proposal_id) {
        if (casted_votes.exists(proposal_id)) {
            delete casted_votes[proposal_id];
        }
        IVoter(user).onVoteRejected{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
    }

    function tryUnlockVoteTokens(uint32 proposal_id) override public view onlyUser {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
        require(msg.value >= Gas.UNLOCK_LOCKED_VOTE_TOKENS_VALUE, StakingErrors.VALUE_TOO_LOW);
        require(created_proposals.exists(proposal_id), StakingErrors.WRONG_PROPOSAL_ID);
        IProposal(expectedProposalAddress(proposal_id)).unlockVoteTokens{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user);
    }

    function unlockVoteTokens(uint32 proposal_id, bool success) override public onlyDaoProposal(proposal_id) {
        if (success && created_proposals.exists(proposal_id)) {
            emit UnlockVotes(proposal_id, created_proposals[proposal_id]);
            delete created_proposals[proposal_id];
            IVoter(user).onVotesUnlocked{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
        } else {
            IVoter(user).onVotesNotUnlocked{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
        }
    }

    function tryUnlockCastedVotes(uint32[] proposal_ids) override public view onlyUser {
        require(msg.value >= proposal_ids.length * Gas.UNLOCK_CASTED_VOTE_VALUE + 1 ton, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
        for (uint i = 0; i < proposal_ids.length; i++) {
            if (casted_votes.exists(proposal_ids[i])) {
                IProposal(expectedProposalAddress(proposal_ids[i])).unlockCastedVote{
                    value: Gas.UNLOCK_CASTED_VOTE_VALUE,
                    flag: MsgFlag.SENDER_PAYS_FEES
                }(user);
            }
        }
        user.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    function unlockCastedVote(uint32 proposal_id, bool success) override public onlyDaoProposal(proposal_id) {
        if (success && casted_votes.exists(proposal_id)) {
            delete casted_votes[proposal_id];
            emit UnlockCastedVotes(proposal_id);
            IVoter(user).onCastedVoteUnlocked{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
        } else {
            IVoter(user).onCastedVoteNotUnlocked{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
        }
    }

    function expectedProposalAddress(uint32 proposal_id) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(dao_root, uint8(DaoPlatformTypes.PlatformType.Proposal), _buildProposalInitialData(proposal_id))));
    }

    function _buildProposalInitialData(uint32 proposal_id) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(proposal_id);
        return builder.toCell();
    }

    function _buildPlatformInitData(address platform_root, uint8 platform_type, TvmCell initial_data) private inline view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: platform_root,
                platformType: platform_type,
                initialData: initial_data,
                platformCode: platform_code
            },
            pubkey: 0,
            code: platform_code
        });
    }

    function _lockedTokens() private view returns (uint128) {
        uint128 locked = 0;
        optional(uint32, uint128) pending_proposal = _tmp_proposals.min();
        while (pending_proposal.hasValue()) {
            (uint32 key, uint128 locked_value) = pending_proposal.get();
            locked += locked_value;
            pending_proposal = _tmp_proposals.next(key);
        }

        optional(uint32, uint128) proposal = created_proposals.min();
        while (proposal.hasValue()) {
            (uint32 proposal_id, uint128 locked_value) = proposal.get();
            locked += locked_value;
            proposal = created_proposals.next(proposal_id);
        }
        return locked;
    }


    function getDetails() external responsible view override returns (UserDataDetails) {
        // TODO: add new vars to Details
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }UserDataDetails(
            token_balance, reward_debt, reward_balance, root, user, current_version
        );
    }

    function processDeposit(uint64 nonce, uint128 _tokens_to_deposit, uint256 _acc_reward_per_share, uint32 code_version) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version) {
            IStakingPool(msg.sender).revertDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
            return;
        }

        uint256 prev_token_balance = token_balance;
        uint256 prev_reward_debt = reward_debt;

        token_balance += _tokens_to_deposit;
        reward_debt = (token_balance * _acc_reward_per_share) / 1e18;

        uint256 new_reward = ((prev_token_balance * _acc_reward_per_share) / 1e18) - prev_reward_debt;
        reward_balance += new_reward;

        IStakingPool(msg.sender).finishDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
    }

    function processBecomeRelay(
        uint128 round_num,
        uint256 eth_addr,
        uint128 lock_time,
        address send_gas_to,
        uint32 user_data_code_version,
        uint32 election_code_version
    ) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (user_data_code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        // lock until end of election + round time + 2 rounds on top of it
        relay_lock_until = now + lock_time;

        address election_addr = getElectionAddress(round_num);
        IElection(election_addr).applyForMembership{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            user, eth_addr, token_balance, send_gas_to, election_code_version
        );
    }

    function relayMembershipRequestAccepted(uint128 round_num, uint128 tokens, uint256 eth_addr, address send_gas_to) external override onlyElection(round_num) {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        emit RelayMembershipRequested(round_num, tokens, user, eth_addr);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function processWithdraw(uint128 _tokens_to_withdraw, uint256 _acc_reward_per_share, address send_gas_to, uint32 code_version) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version || _tokens_to_withdraw > token_balance || now < relay_lock_until || _canWithdrawVotes()) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        uint256 prev_token_balance = token_balance;
        uint256 prev_reward_debt = reward_debt;

        token_balance -= _tokens_to_withdraw;
        reward_debt = (token_balance * _acc_reward_per_share) / 1e18;

        uint256 new_reward = ((prev_token_balance * _acc_reward_per_share) / 1e18) - prev_reward_debt;
        reward_balance += new_reward;

        IStakingPool(msg.sender).finishWithdraw{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, _tokens_to_withdraw, send_gas_to);

    }

    function _buildInitData(uint8 type_id, TvmCell _initialData) private inline view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: address(this),
                platformType: type_id,
                initialData: _initialData,
                platformCode: platform_code
            },
            pubkey: 0,
            code: platform_code
        });
    }

    function _buildElectionParams(uint128 round_num) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function getElectionAddress(uint128 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    onBounce(TvmSlice slice) external {
        uint32 functionId = slice.decode(uint32);
        if (functionId == tvm.functionId(IProposal.castVote)) {
            tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
            uint32 proposal_id = slice.decode(uint32);
            if (casted_votes.exists(proposal_id)) {
                delete casted_votes[proposal_id];
            }
            user.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
        }
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        user = initialData.decode(address);

        TvmSlice params = s.loadRefAsSlice();
        current_version = params.decode(uint32);
        dao_root = params.decode(address);

        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (new_version == current_version) {
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit UserDataCodeUpgraded(new_version);

            TvmBuilder builder;

            builder.store(root);
            builder.store(user);
            builder.store(current_version);
            builder.store(new_version);
            builder.store(send_gas_to);
            builder.store(relay_lock_until);
            builder.store(token_balance);
            builder.store(reward_balance);
            builder.store(reward_debt);

            builder.store(platform_code);

            TvmBuilder dao_data;
            dao_data.store(dao_root);
            dao_data.store(_proposal_nonce);
            dao_data.store(created_proposals);
            dao_data.store(_tmp_proposals);
            dao_data.store(casted_votes);

            builder.store(dao_data);

            // set code after complete this method
            tvm.setcode(code);

            // run onCodeUpgrade from new code
            tvm.setCurrentCode(code);
            onCodeUpgrade(builder.toCell());
        }
    }

    modifier onlyRoot() {
        require(msg.sender == root, StakingErrors.NOT_ROOT);
        _;
    }

    modifier onlyElection(uint128 round_num) {
        address election_addr = getElectionAddress(round_num);
        require (election_addr == msg.sender, StakingErrors.NOT_ELECTION);
        _;
    }

    modifier onlyUser {
       require(msg.sender == user, StakingErrors.NOT_OWNER);
        _;
    }

    modifier onlyDaoRoot {
       require(msg.sender == dao_root, StakingErrors.NOT_DAO_ROOT);
        _;
    }
}
