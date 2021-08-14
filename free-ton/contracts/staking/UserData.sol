pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./interfaces/IElection.sol";

import "./../utils/ErrorCodes.sol";
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
    uint16 constant public MAX_REASON_LENGTH = 512; //todo change

    uint32 public current_version;
    TvmCell public platform_code;

    uint128 public token_balance;
    uint32 relay_lock_until;

    RewardRoundData[] public rewardRounds;

    uint160 public relay_eth_address;
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
        require(msg.sender == getProposalAddress(proposal_id), ErrorCodes.NOT_PROPOSAL);
        _;
    }

    // Cant be deployed directly
    constructor() public { revert(); }

    // ---------------- DAO -------------------

    function _reserve() internal view returns (uint128) {
        return math.max(address(this).balance - msg.value, Gas.USER_DATA_INITIAL_BALANCE);
    }

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
        if (token_balance - _lockedTokens() >= threshold && !slashed) {
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
        tvm.rawReserve(_reserve(), 2);

        uint16 error;

        if (slashed) error = ErrorCodes.SLASHED;
        if (code_version > current_version) error = ErrorCodes.OLD_VERSION;
        if (msg.value < Gas.CAST_VOTE_VALUE) error = ErrorCodes.VALUE_TOO_LOW;
        if (casted_votes.exists(proposal_id)) error = ErrorCodes.ALREADY_VOTED;
        if (bytes(reason).length > MAX_REASON_LENGTH) error = ErrorCodes.REASON_IS_TOO_LONG;

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
        }(proposal_id, ErrorCodes.PROPOSAL_IS_NOT_ACTIVE);
    }

    function tryUnlockVoteTokens(uint32 code_version, uint32 proposal_id) override public view onlyRoot {
        tvm.rawReserve(_reserve(), 2);
        uint16 error;

        if (code_version > current_version) error = ErrorCodes.OLD_VERSION;
        if (msg.value < Gas.UNLOCK_LOCKED_VOTE_TOKENS_VALUE) error = ErrorCodes.VALUE_TOO_LOW;
        if (!created_proposals.exists(proposal_id)) error = ErrorCodes.WRONG_PROPOSAL_ID;

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
            }(proposal_id, ErrorCodes.WRONG_PROPOSAL_STATE);
        }
    }

    function tryUnlockCastedVotes(uint32 code_version, uint32[] proposal_ids) override public view onlyRoot {
        tvm.rawReserve(_reserve(), 2);

        uint16 error;

        if (code_version > current_version) error = ErrorCodes.OLD_VERSION;
        if (msg.value < proposal_ids.length * Gas.UNLOCK_CASTED_VOTE_VALUE + 1 ton) error = ErrorCodes.VALUE_TOO_LOW;

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
            }([proposal_id], ErrorCodes.WRONG_PROPOSAL_STATE);
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
        tvm.rawReserve(_reserve(), 2);

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
        tvm.rawReserve(_reserve(), 2);

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
        require (!slashed, ErrorCodes.SLASHED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);
        require (now >= relay_lock_until, ErrorCodes.RELAY_LOCK_ACTIVE);

        tvm.rawReserve(_reserve(), 2);

        syncRewards(reward_rounds, token_balance);

        uint128[] rewards = new uint128[](rewardRounds.length - 1);
        for (uint i = 0; i < rewardRounds.length - 1; i++) {
            rewards[i] = rewardRounds[i].reward_balance;
            rewardRounds[i].reward_balance = 0;
        }

        IStakingPool(msg.sender).finishClaimReward{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, rewards, send_gas_to);
    }

    function getRewardForRelayRound(uint32 round_num) external onlyRelay {
        require (!slashed, ErrorCodes.SLASHED);
        tvm.accept();

        IStakingPool(root).processGetRewardForRelayRound{value: Gas.MIN_GET_REWARD_RELAY_ROUND_MSG_VALUE}(user, round_num);
    }

    function processGetRewardForRelayRound2(
        IStakingPool.RewardRound[] reward_rounds,
        uint32 round_num,
        uint32 code_version,
        uint32 relay_round_code_version
    ) external override onlyRoot {
        require (!slashed, ErrorCodes.SLASHED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        tvm.rawReserve(_reserve(), 2);

        syncRewards(reward_rounds, token_balance);

        address relay_round_addr = getRelayRoundAddress(round_num);
        IRelayRound(relay_round_addr).getRewardForRound{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, relay_round_code_version);
    }

    function receiveRewardForRelayRound(
        uint32 relay_round_num, uint32 reward_round_num, uint128 reward
    ) external override onlyRelayRound(relay_round_num) {
        tvm.rawReserve(_reserve(), 2);

        rewardRounds[reward_round_num].reward_balance += reward;
        emit RelayRoundRewardClaimed(relay_round_num, reward_round_num, reward);
    }

    function processLinkRelayAccounts(
        uint256 ton_pubkey,
        uint160 eth_address,
        uint32 code_version
    ) external override onlyRoot {
        require (!slashed, ErrorCodes.SLASHED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        relay_ton_pubkey = ton_pubkey;
        ton_pubkey_confirmed = false;

        relay_eth_address = eth_address;
        eth_address_confirmed = false;
    }

    function confirmTonAccount() external {
        require (msg.pubkey() != 0, ErrorCodes.INTERNAL_ADDRESS);
        require (msg.pubkey() == relay_ton_pubkey, ErrorCodes.ACCOUNT_NOT_LINKED);
        require (ton_pubkey_confirmed == false, ErrorCodes.ACCOUNT_ALREADY_CONFIRMED);
        require (!slashed, ErrorCodes.SLASHED);

        tvm.accept();
        ton_pubkey_confirmed = true;
    }

    function processConfirmEthAccount(uint160 eth_address, address send_gas_to) external override onlyRoot {
        require (eth_address_confirmed == false, ErrorCodes.ACCOUNT_ALREADY_CONFIRMED);
        require (eth_address == relay_eth_address, ErrorCodes.ACCOUNT_NOT_LINKED);
        require (!slashed, ErrorCodes.SLASHED);

        tvm.rawReserve(_reserve(), 2);

        eth_address_confirmed = true;

        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function becomeRelayNextRound() external onlyRelay {
        require (!slashed, ErrorCodes.SLASHED);
        tvm.accept();

        IStakingPool(root).processBecomeRelayNextRound{value: Gas.MIN_RELAY_REQ_MSG_VALUE}(user);
    }

    function processBecomeRelayNextRound2(
        uint32 round_num,
        uint32 lock_time,
        uint128 min_deposit,
        uint32 code_version,
        uint32 election_code_version
    ) external override onlyRoot {
        require (token_balance >= min_deposit, ErrorCodes.LOW_RELAY_DEPOSIT);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        tvm.rawReserve(_reserve(), 2);

        address election_addr = getElectionAddress(round_num);
        IElection(election_addr).applyForMembership{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            user, relay_ton_pubkey, relay_eth_address, token_balance, lock_time, election_code_version
        );
    }

    function relayMembershipRequestAccepted(
        uint32 round_num, uint128 tokens, uint256 ton_pubkey, uint256 eth_addr, uint32 lock_time
    ) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        // lock for 30 days
        relay_lock_until = now + lock_time;

        emit RelayMembershipRequested(round_num, tokens, ton_pubkey, eth_addr, relay_lock_until);
    }

    function processWithdraw(
        uint128 _tokens_to_withdraw,
        IStakingPool.RewardRound[] reward_rounds,
        address send_gas_to,
        uint32 code_version
    ) external override onlyRoot {
        require (token_balance >= _tokens_to_withdraw, ErrorCodes.LOW_TOKEN_BALANCE);
        require (now >= relay_lock_until, ErrorCodes.RELAY_LOCK_ACTIVE);
        require (!slashed, ErrorCodes.SLASHED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);
        require (_canWithdrawVotes(), ErrorCodes.CANT_WITHDRAW_VOTES);

        tvm.rawReserve(_reserve(), 2);

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

    function _buildElectionParams(uint32 round_num) private inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint32 round_num) private inline view returns (TvmCell) {
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

    function getElectionAddress(uint32 round_num) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(
            root,
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function getRelayRoundAddress(uint32 round_num) private view returns (address) {
        return address(tvm.hash(_buildPlatformInitData(
            root,
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        )));
    }

    onBounce(TvmSlice slice) external {
        uint32 functionId = slice.decode(uint32);
        if (functionId == tvm.functionId(IProposal.castVote)) {
            tvm.rawReserve(_reserve(), 2);
            uint32 proposal_id = slice.decode(uint32);
            if (casted_votes.exists(proposal_id)) {
                delete casted_votes[proposal_id];
            }
            user.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
        }
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(_reserve(), 2);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        user = initialData.decode(address);

        TvmSlice params = s.loadRefAsSlice();
        (current_version, ) = params.decode(uint32, uint32);

        dao_root = params.decode(address);

        rewardRounds.push(RewardRoundData(0, 0));

        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external override onlyRoot {
        if (new_version == current_version) {
            tvm.rawReserve(_reserve(), 2);
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit UserDataCodeUpgraded(new_version);

            uint8 _tmp;
            TvmBuilder builder;
            builder.store(root); // 256
            builder.store(_tmp); // 8
            builder.store(send_gas_to); // 256

            builder.store(platform_code); // ref1

            TvmBuilder initial;
            initial.store(user);

            builder.storeRef(initial); // ref2

            TvmBuilder params;
            params.store(new_version);
            params.store(current_version);
            params.store(dao_root);

            builder.storeRef(params); // ref3

            TvmBuilder data_builder;

            TvmBuilder builder_1;
            builder_1.store(token_balance); // 128
            builder_1.store(relay_lock_until); // 32
            builder_1.store(rewardRounds); // ref1
            builder_1.store(relay_eth_address); // 160
            builder_1.store(eth_address_confirmed); // 1
            builder_1.store(relay_ton_pubkey); // 256
            builder_1.store(ton_pubkey_confirmed); // 1
            builder_1.store(slashed); // 1

            TvmBuilder dao_data;
            dao_data.store(_proposal_nonce); // 32
            dao_data.store(created_proposals); // ref1
            dao_data.store(_tmp_proposals); // ref2
            dao_data.store(casted_votes); // ref3

            data_builder.storeRef(builder_1); // ref1
            data_builder.storeRef(dao_data); // ref2

            builder.storeRef(data_builder);

            // set code after complete this method
            tvm.setcode(code);

            // run onCodeUpgrade from new code
            tvm.setCurrentCode(code);
            onCodeUpgrade(builder.toCell());
        }
    }

    /*
    upgrade_data
        bits:
            address root
            uint8 dummy
            address send_gas_to
        refs:
            1: platform_code
            2: initial
                bits:
                    address user
            3: params:
                bits:
                    uint32 new_version
                    uint32 current_version
                    address dao_root
            4: data
                refs:
                    1: data_1
                        bits:
                            uint128 token_balance
                            uint32 relay_lock_until
                            uint160 relay_eth_address
                            bool eth_address_confirmed
                            uint256 relay_ton_pubkey
                            bool ton_pubkey_confirmed
                            bool slashed
                        refs:
                            1: rewardRounds
                    2: dao_data
                        bits:
                            uint32 _proposal_nonce
                        refs:
                            1: created_proposals
                            2: _tmp_proposals
                            3: casted_votes
    */

    modifier onlyRoot() {
        require(msg.sender == root, ErrorCodes.NOT_ROOT);
        _;
    }

    modifier onlyElection(uint32 round_num) {
        address election_addr = getElectionAddress(round_num);
        require (election_addr == msg.sender, ErrorCodes.NOT_ELECTION);
        _;
    }

    modifier onlyRelayRound(uint32 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_RELAY_ROUND);
        _;
    }

    modifier onlyDaoRoot {
       require(msg.sender == dao_root, ErrorCodes.NOT_DAO_ROOT);
        _;
    }

    modifier onlyRelay {
        require (msg.pubkey() != 0, ErrorCodes.INTERNAL_ADDRESS);
        require (msg.pubkey() == relay_ton_pubkey, ErrorCodes.ACCOUNT_NOT_LINKED);
        require (ton_pubkey_confirmed, ErrorCodes.ACCOUNT_NOT_CONFIRMED);
        require (eth_address_confirmed, ErrorCodes.ACCOUNT_NOT_CONFIRMED);
        _;
    }
}
