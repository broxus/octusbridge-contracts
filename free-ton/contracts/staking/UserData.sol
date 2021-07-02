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
import "../dao/interfaces/IStakingAccount.sol";

contract UserData is IUserData, IUpgradableByRequest {
    uint16 constant public MAX_REASON_LENGTH = 2048; //todo change

    uint32 public current_version;
    TvmCell public platform_code;

    uint128 public token_balance;
    uint128 relay_lock_until;

    RewardRoundData[] public rewardRounds;

    uint256 public relay_eth_address;
    bool public eth_address_confirmed;

    uint256 public relay_ton_pubkey;
    bool public ton_pubkey_confirmed;

    bool public slashed;

    address public root; // setup from initialData
    address public user; // setup from initialData

    address public dao_root;
    uint32 _proposal_nonce;

    mapping(uint32 /*proposal_id*/ => uint128 /*locked_value*/) public created_proposals;
    mapping(uint32 /*nonce*/ => uint128 /*locked_value*/) public _tmp_proposals;

    mapping(uint32 /*proposal_id*/ => bool /*support*/) public casted_votes;

    modifier onlyDaoProposal(uint32 proposal_id) {
        require(msg.sender == getProposalAddress(proposal_id), StakingErrors.NOT_PROPOSAL);
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

    function castVote(uint32 code_version, uint32 proposal_id, bool support, string reason) public override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        uint16 error;

        if (code_version > current_version) error = StakingErrors.OLD_VERSION;
        if (msg.value < Gas.CAST_VOTE_VALUE) error = StakingErrors.VALUE_TOO_LOW;
        if (casted_votes.exists(proposal_id)) error = StakingErrors.ALREADY_VOTED;
        if (bytes(reason).length > MAX_REASON_LENGTH) error = StakingErrors.REASON_IS_TOO_LONG;

        if (error != 0){
            IVoter(user).onVoteRejected{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(proposal_id, error);
            return;
        }

        emit VoteCast(proposal_id, support, token_balance, reason);
        casted_votes[proposal_id] = support;
        IProposal(getProposalAddress(proposal_id)).castVote{
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
        IVoter(user).onVoteRejected{
            value: 0,
            flag: MsgFlag.REMAINING_GAS,
            bounce: false
        }(proposal_id, StakingErrors.PROPOSAL_IS_NOT_ACTIVE);
    }

    function tryUnlockVoteTokens(uint32 code_version, uint32 proposal_id) override public view onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
        uint16 error;

        if (code_version > current_version) error = StakingErrors.OLD_VERSION;
        if (msg.value < Gas.UNLOCK_LOCKED_VOTE_TOKENS_VALUE) error = StakingErrors.VALUE_TOO_LOW;
        if (!created_proposals.exists(proposal_id)) error = StakingErrors.WRONG_PROPOSAL_ID;

        if (error != 0){
            IVoter(user).onVotesNotUnlocked{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(proposal_id, error);
            return;
        }

        IProposal(getProposalAddress(proposal_id)).unlockVoteTokens{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user);
    }

    function unlockVoteTokens(uint32 proposal_id, bool success) override public onlyDaoProposal(proposal_id) {
        if (success && created_proposals.exists(proposal_id)) {
            emit UnlockVotes(proposal_id, created_proposals[proposal_id]);
            delete created_proposals[proposal_id];
            IVoter(user).onVotesUnlocked{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(proposal_id);
        } else {
            IVoter(user).onVotesNotUnlocked{
                value: 0,
                flag: MsgFlag.REMAINING_GAS,
                bounce: false
            }(proposal_id, StakingErrors.WRONG_PROPOSAL_STATE);
        }
    }

    function tryUnlockCastedVotes(uint32 code_version, uint32[] proposal_ids) override public view onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        uint16 error;

        if (code_version > current_version) error = StakingErrors.OLD_VERSION;
        if (msg.value < proposal_ids.length * Gas.UNLOCK_CASTED_VOTE_VALUE + 1 ton) error = StakingErrors.VALUE_TOO_LOW;

        if (error != 0){
            IVoter(user).onCastedVoteNotUnlocked{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(proposal_ids, error);
            return;
        }

        for (uint i = 0; i < proposal_ids.length; i++) {
            if (casted_votes.exists(proposal_ids[i])) {
                IProposal(getProposalAddress(proposal_ids[i])).unlockCastedVote{
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
            IVoter(user).onCastedVoteNotUnlocked{
                value: 0,
                flag: MsgFlag.REMAINING_GAS, bounce: false
            }([proposal_id], StakingErrors.WRONG_PROPOSAL_STATE);
        }
    }

    function _buildProposalInitialData(uint32 proposal_id) private inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(proposal_id);
        return builder.toCell();
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
            token_balance, rewardRounds, root, user, current_version
        );
    }

    function syncRewards(IStakingPool.RewardRound[] reward_rounds, uint256 updated_balance) internal {
        for (uint i = rewardRounds.length - 1; i < reward_rounds.length; i++) {
            if (i >= rewardRounds.length) {
                rewardRounds.push(RewardRoundData(0, 0));
            }

            IStakingPool.RewardRound remote_round = reward_rounds[i];
            RewardRoundData local_round = rewardRounds[i];

            uint128 new_reward = uint128(math.muldiv(token_balance, remote_round.accRewardPerShare, 1e18) - local_round.reward_debt);
            rewardRounds[i].reward_balance += new_reward;
            rewardRounds[i].reward_debt = uint128(math.muldiv(updated_balance, remote_round.accRewardPerShare, 1e18));
        }
    }

    function slash(IStakingPool.RewardRound[] reward_rounds, address send_gas_to) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        syncRewards(reward_rounds, token_balance);
        slashed = true;

        uint128[] ban_rewards = new uint128[](rewardRounds.length);
        for (uint i = 0; i < rewardRounds.length; i++) {
            ban_rewards[i] = rewardRounds[i].reward_balance;
            rewardRounds[i].reward_balance = 0;
        }
        uint128 ban_token_balance = token_balance;
        token_balance = 0;

        IStakingPool(msg.sender).confirmSlash{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            user, ban_rewards, ban_token_balance, send_gas_to
        );
    }

    function processDeposit(
        uint64 nonce,
        uint128 _tokens_to_deposit,
        IStakingPool.RewardRound[] reward_rounds,
        uint32 code_version
    ) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version || slashed) {
            IStakingPool(msg.sender).revertDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
            return;
        }

        syncRewards(reward_rounds, token_balance + _tokens_to_deposit);
        token_balance += _tokens_to_deposit;

        IStakingPool(msg.sender).finishDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
    }

    function processClaimReward(
        IStakingPool.RewardRound[] reward_rounds,
        address send_gas_to,
        uint32 code_version
    ) external override onlyRoot {
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        syncRewards(reward_rounds, token_balance);

        uint128[] rewards = new uint128[](rewardRounds.length);
        for (uint i = 0; i < rewardRounds.length; i++) {
            rewards[i] = rewardRounds[i].reward_balance;
            rewardRounds[i].reward_balance = 0;
        }

        IStakingPool(msg.sender).finishClaimReward{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, rewards, send_gas_to);
    }

    function processGetRelayRewardForRound(
        IStakingPool.RewardRound[] reward_rounds,
        uint128 round_num,
        address send_gas_to,
        uint32 code_version,
        uint32 relay_round_code_version
    ) external override onlyRoot {
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        syncRewards(reward_rounds, token_balance);

        address relay_round_addr = getRelayRoundAddress(round_num);
        IRelayRound(relay_round_addr).getRewardForRound(user, send_gas_to, relay_round_code_version);
    }

    function receiveRewardForRelayRound(
        uint128 relay_round_num, uint128 reward_round_num, uint128 reward, address send_gas_to
    ) external override onlyRelayRound(relay_round_num) {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        rewardRounds[reward_round_num].reward_balance += reward;
        emit RelayRoundRewardClaimed(relay_round_num, reward_round_num, reward);

        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function processLinkRelayAccounts(
        uint256 ton_pubkey,
        uint256 eth_address,
        address send_gas_to,
        uint32 user_data_code_version
    ) external override onlyRoot {
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (user_data_code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        relay_ton_pubkey = ton_pubkey;
        ton_pubkey_confirmed = false;

        relay_eth_address = eth_address;
        eth_address_confirmed = false;
    }

    function confirmTonAccount() external {
        require (msg.pubkey() != 0, StakingErrors.INTERNAL_ADDRESS);
        require (msg.pubkey() == relay_ton_pubkey, StakingErrors.ACCOUNT_NOT_LINKED);
        require (ton_pubkey_confirmed == false, StakingErrors.ACCOUNT_ALREADY_CONFIRMED);
        require (!slashed, StakingErrors.SLASHED);

        tvm.accept();
        ton_pubkey_confirmed = true;
    }

    function processConfirmEthAccount(uint256 eth_address, address send_gas_to) external override onlyRoot {
        require (eth_address_confirmed == false, StakingErrors.ACCOUNT_ALREADY_CONFIRMED);
        require (eth_address == relay_eth_address, StakingErrors.ACCOUNT_NOT_LINKED);
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        eth_address_confirmed = true;

        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function processBecomeRelay(
        uint128 round_num,
        uint128 lock_time,
        address send_gas_to,
        uint32 user_data_code_version,
        uint32 election_code_version
    ) external override onlyRoot {
        require (eth_address_confirmed, StakingErrors.ACCOUNT_NOT_CONFIRMED);
        require (ton_pubkey_confirmed, StakingErrors.ACCOUNT_NOT_CONFIRMED);
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (user_data_code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        address election_addr = getElectionAddress(round_num);
        IElection(election_addr).applyForMembership{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            user, relay_ton_pubkey, relay_eth_address, token_balance, lock_time, send_gas_to, election_code_version
        );
    }

    function relayMembershipRequestAccepted(
        uint128 round_num, uint128 tokens, uint256 ton_pubkey, uint256 eth_addr, uint128 lock_time, address send_gas_to
    ) external override onlyElection(round_num) {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        // lock until end of election + round time + 2 rounds on top of it
        relay_lock_until = now + lock_time;

        emit RelayMembershipRequested(round_num, tokens, ton_pubkey, eth_addr);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function processWithdraw(
        uint128 _tokens_to_withdraw,
        IStakingPool.RewardRound[] reward_rounds,
        address send_gas_to,
        uint32 code_version
    ) external override onlyRoot {
        require (!slashed, StakingErrors.SLASHED);

        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version || _tokens_to_withdraw > token_balance || now < relay_lock_until || !_canWithdrawVotes()) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        syncRewards(reward_rounds, token_balance - _tokens_to_withdraw);
        token_balance -= _tokens_to_withdraw;

        IStakingPool(msg.sender).finishWithdraw{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, _tokens_to_withdraw, send_gas_to);

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

    function _buildElectionParams(uint128 round_num) private inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint128 round_num) private inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function getProposalAddress(uint32 proposal_id) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(
            dao_root,
            uint8(DaoPlatformTypes.PlatformType.Proposal),
            _buildProposalInitialData(proposal_id)))
        );
    }

    function getElectionAddress(uint128 round_num) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(
            root,
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function getRelayRoundAddress(uint128 round_num) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(
            root,
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
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

        rewardRounds.push(RewardRoundData(0, 0));

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
            builder.store(rewardRounds);

            builder.store(relay_eth_address);
            builder.store(eth_address_confirmed);
            builder.store(relay_ton_pubkey);
            builder.store(ton_pubkey_confirmed);

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

    modifier onlyRelayRound(uint128 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, StakingErrors.NOT_RELAY_ROUND);
        _;
    }

    modifier onlyDaoRoot {
       require(msg.sender == dao_root, StakingErrors.NOT_DAO_ROOT);
        _;
    }
}
