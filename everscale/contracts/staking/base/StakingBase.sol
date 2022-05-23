pragma ton-solidity >= 0.57.0;
//pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenWallet.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";

import "./../interfaces/IUserData.sol";
import "./../interfaces/IUpgradableByRequest.sol";
import "./../interfaces/IStakingPool.sol";
import "./../interfaces/IStakingDao.sol";
import "./../interfaces/IRelayRound.sol";
import "./../interfaces/IElection.sol";

import "./../UserData.sol";
import "./../Election.sol";
import "./../RelayRound.sol";

import "./../libraries/PlatformTypes.sol";
import "./../../utils/ErrorCodes.sol";
import "./../libraries/Gas.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "@broxus/contracts/contracts/platform/Platform.sol";
import "../../utils/Delegate.sol";


abstract contract StakingPoolBase is IAcceptTokensTransferCallback, IStakingPool, IStakingDao, Delegate {
    // Events
    event RewardDeposit(uint128 amount, uint32 reward_round_num);
    event Deposit(address user, uint128 amount);
    event Withdraw(address user, uint128 amount);
    event RewardClaimed(address user, uint128 reward_tokens);
    event NewRewardRound(uint32 round_num);

    event ElectionStarted(uint32 round_num, uint32 election_start_time, uint32 election_end_time, address election_addr);
    event ElectionEnded(uint32 round_num, uint32 relay_requests, bool min_relays_ok);
    event RelayRoundInitialized(
        uint32 round_num,
        uint32 round_start_time,
        uint32 round_end_time,
        address round_addr,
        uint32 relays_count,
        bool duplicate
    );
    event RelayRoundCreation(uint32 round_num, uint160[] eth_keys, uint32 round_end);
    event RelaySlashed(address user, uint128 tokens_withdrawn);
    event Emergency(bool state);

    event DepositReverted(address user, uint128 amount);

    event DaoRootUpdated(address new_dao_root);
    event BridgeEventEthTonConfigUpdated(address new_bridge_event_config_eth_ton);
    event BridgeEventTonEthConfigUpdated(address new_bridge_event_config_ton_eth);
    event BridgeEventTonSolConfigUpdated(address new_bridge_event_config_ton_sol);

    event TonEthEventDeployValueUpdated(uint128 new_value);
    event TonSolEventDeployValueUpdated(uint128 new_value);

    event AdminUpdated(address new_admin);
    event RewarderUpdated(address new_rewarder);
    event RescuerUpdated(address new_rescuer);

    event ActiveUpdated(bool active);

    event RequestedUserDataUpgrade(address user);
    event RequestedElectionUpgrade(uint32 round_num);
    event RequestedRelayRoundUpgrade(uint32 round_num);

    event UserDataCodeUpgraded(uint32 code_version);
    event ElectionCodeUpgraded(uint32 code_version);
    event RelayRoundCodeUpgraded(uint32 code_version);

    event RelayConfigUpdated(RelayConfigDetails);

    uint32 static deploy_nonce;
    address static deployer;

    bool active;

    uint32 lastExtCall;

    CodeData code_data;

    RelayRoundsDetails round_details;

    BaseDetails base_details;

    address public bridge_event_config_ton_sol;

    RelayConfigDetails relay_config = RelayConfigDetails(
        30 days, 7 days, 2 days, 4 days, 1 hours, 30, 13, 100000 * 10**9, 500 ton, 1000000, 1000000
    );

    uint128 tonEthEventDeployValue = 2.5 ton;
    uint128 tonSolEventDeployValue = 2.5 ton;

    // payloads for token receive callback
    uint8 constant STAKE_DEPOSIT = 0;
    uint8 constant REWARD_UP = 1;

    uint8 constant RELAY_PACK_SIZE = 30;

    // should be at least 60 in prod
    uint32 constant EXTERNAL_CALL_INTERVAL = 60;

    uint256 constant SCALING_FACTOR = 1e18;

    struct PendingDeposit {
        address user;
        uint128 amount;
        address send_gas_to;
    }

    uint64 deposit_nonce = 0;
    // this is used to prevent data loss on bounced messages during deposit
    mapping (uint64 => PendingDeposit) deposits;

    function getDetails() public view responsible returns (BaseDetails) {
        return{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }base_details;
    }

    function getCodeData() external view responsible returns (CodeData) {
        return{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }code_data;
    }

    function getRelayRoundsDetails() external override view responsible returns (RelayRoundsDetails) {
        return{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }round_details;
    }

    function getRelayConfig() external view responsible returns (RelayConfigDetails) {
        return{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }relay_config;
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

    function _reserve() internal view returns (uint128) {
        return math.max(address(this).balance - msg.value, Gas.ROOT_INITIAL_BALANCE);
    }

    function setDaoRoot(address new_dao_root, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit DaoRootUpdated(new_dao_root);
        base_details.dao_root = new_dao_root;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setEventDeployValues(uint128 ton_eth_event_value, uint128 ton_sol_event_value, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        emit TonEthEventDeployValueUpdated(ton_eth_event_value);
        emit TonSolEventDeployValueUpdated(ton_sol_event_value);

        tonEthEventDeployValue = ton_eth_event_value;
        tonSolEventDeployValue = ton_sol_event_value;

        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setBridgeEventEthTonConfig(address new_bridge_event_config_eth_ton, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit BridgeEventEthTonConfigUpdated(new_bridge_event_config_eth_ton);
        base_details.bridge_event_config_eth_ton = new_bridge_event_config_eth_ton;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setBridgeEventTonEthConfig(address new_bridge_event_config_ton_eth, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit BridgeEventTonEthConfigUpdated(new_bridge_event_config_ton_eth);
        base_details.bridge_event_config_ton_eth = new_bridge_event_config_ton_eth;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setBridgeEventTonSolConfig(address new_bridge_event_config_ton_sol, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit BridgeEventTonSolConfigUpdated(new_bridge_event_config_ton_sol);
        bridge_event_config_ton_sol = new_bridge_event_config_ton_sol;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setAdmin(address new_admin, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit AdminUpdated(new_admin);
        base_details.admin = new_admin;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setRescuer(address new_rescuer, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit RescuerUpdated(new_rescuer);
        base_details.rescuer = new_rescuer;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function setRewarder(address new_rewarder, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        emit RewarderUpdated(new_rewarder);
        base_details.rewarder = new_rewarder;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    // Active
    function setActive(bool new_active, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        if (
            new_active
            && base_details.dao_root.value != 0
            && base_details.bridge_event_config_eth_ton.value != 0
            && base_details.bridge_event_config_ton_eth.value != 0
            && code_data.has_platform_code
            && code_data.user_data_version > 0
            && code_data.election_version > 0
            && code_data.relay_round_version > 0
        ) {
            active = true;
        } else {
            active = false;
        }
        emit ActiveUpdated(active);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function isActive() external view responsible returns (bool) {
        return{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } active;
    }

    function setRelayConfig(RelayConfigDetails new_relay_config, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        // we update pool info, because reward per sec params could be updated
        updatePoolInfo();

        relay_config = new_relay_config;

        emit RelayConfigUpdated(relay_config);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    /*
        @notice Creates token wallet for configured root token
    */
    function setUpTokenWallet() internal view {
        ITokenRoot(base_details.tokenRoot).deployWallet{value: Gas.TOKEN_WALLET_DEPLOY_VALUE, callback: StakingPoolBase.receiveTokenWalletAddress }(
            address(this), // owner
            Gas.TOKEN_WALLET_DEPLOY_VALUE / 2 // deploy grams
        );
    }

    /*
        @notice Store vault's token wallet address
        @dev Only root can call with correct params
        @param wallet Farm pool's token wallet
    */
    function receiveTokenWalletAddress(address wallet) external {
        require (msg.sender == base_details.tokenRoot, ErrorCodes.NOT_TOKEN_WALLET);

        tvm.rawReserve(_reserve(), 0);
        base_details.tokenWallet = wallet;
    }

    function startNewRewardRound(address send_gas_to) external onlyRewarder {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        if (base_details.rewardRounds.length > 0) {
            RewardRound last_round = base_details.rewardRounds[base_details.rewardRounds.length - 1];
            require (last_round.rewardTokens > 0, ErrorCodes.EMPTY_REWARD_ROUND);
        }

        tvm.rawReserve(_reserve(), 0);

        updatePoolInfo();

        base_details.rewardRounds.push(RewardRound(0, 0, 0, now));
        emit NewRewardRound(uint32(base_details.rewardRounds.length - 1));

        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    // try to decode deposit payload
    function decodeDepositPayload(TvmCell payload) public view returns (uint8 deposit_type, bool correct) {
        // check if payload assembled correctly
        TvmSlice slice = payload.toSlice();
        // 1 uint8
        if (!slice.hasNBitsAndRefs(8, 0)) {
            return (0, false);
        }
        deposit_type = slice.decode(uint8);
        return (deposit_type, true);
    }

    // deposit occurs here
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override {
        require (msg.sender == base_details.tokenWallet);

        tvm.rawReserve(_reserve(), 0);

        (uint8 deposit_type, bool correct) = decodeDepositPayload(payload);

        if (msg.value < Gas.MIN_CALL_MSG_VALUE || !active || base_details.emergency || !correct) {
            // too low msg.value or emergency or !active or bad payload
            ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                amount,
                sender,
                0,
                remainingGasTo,
                true,
                payload
            );
            return;
        }

        updatePoolInfo();

        if (deposit_type == STAKE_DEPOSIT) {
            deposit_nonce += 1;
            deposits[deposit_nonce] = PendingDeposit(sender, amount, remainingGasTo);

            address userDataAddr = getUserDataAddress(sender);
            UserData(userDataAddr).processDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(deposit_nonce, amount, base_details.rewardRounds, code_data.user_data_version);
        } else if (deposit_type == REWARD_UP) {
            base_details.rewardTokenBalance += amount;
            base_details.rewardRounds[base_details.rewardRounds.length - 1].rewardTokens += amount;
            emit RewardDeposit(amount, uint32(base_details.rewardRounds.length - 1));

            remainingGasTo.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
        } else {
            // unrecognized deposit type
            ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                amount,
                sender,
                0,
                remainingGasTo,
                true,
                payload
            );
        }
    }

    function revertDeposit(uint64 _deposit_nonce) external override {
        PendingDeposit deposit = deposits[_deposit_nonce];
        address expectedAddr = getUserDataAddress(deposit.user);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_USER_DATA);

        tvm.rawReserve(_reserve(), 0);

        delete deposits[_deposit_nonce];
        emit DepositReverted(deposit.user, deposit.amount);

        TvmCell _empty;
        ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            deposit.amount, deposit.user, 0, deposit.send_gas_to, true, _empty
        );
    }

    function finishDeposit(uint64 _deposit_nonce) external override {
        PendingDeposit deposit = deposits[_deposit_nonce];
        address expectedAddr = getUserDataAddress(deposit.user);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_USER_DATA);

        tvm.rawReserve(_reserve(), 0);

        base_details.tokenBalance += deposit.amount;

        emit Deposit(deposit.user, deposit.amount);
        delete deposits[_deposit_nonce];

        deposit.send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function withdraw(uint128 amount, address send_gas_to) public onlyActive {
        require (amount > 0, ErrorCodes.ZERO_AMOUNT_INPUT);
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        updatePoolInfo();

        address userDataAddr = getUserDataAddress(msg.sender);
        // we cant check if user has any balance here, delegate it to UserData
        UserData(userDataAddr).processWithdraw{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            amount, base_details.rewardRounds, base_details.emergency, send_gas_to, code_data.user_data_version
        );
    }

    function finishWithdraw(
        address user,
        uint128 withdraw_amount,
        address send_gas_to
    ) public override onlyUserData(user) {
        tvm.rawReserve(_reserve(), 0);

        base_details.tokenBalance -= withdraw_amount;

        emit Withdraw(user, withdraw_amount);
        TvmCell tvmcell;
        ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            withdraw_amount, user, 0, send_gas_to, true, tvmcell
        );
    }

    function claimReward(address send_gas_to) external onlyActive {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!base_details.emergency, ErrorCodes.EMERGENCY);

        tvm.rawReserve(_reserve(), 0);

        updatePoolInfo();
        address userDataAddr = getUserDataAddress(msg.sender);
        // we cant check if user has any balance here, delegate it to UserData
        UserData(userDataAddr).processClaimReward{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            base_details.rewardRounds, send_gas_to, code_data.user_data_version
        );
    }

    function finishClaimReward(address user, uint128[] rewards, address send_gas_to) external override onlyUserData(user) {
        tvm.rawReserve(_reserve(), 0);

        uint128 user_token_reward = 0;
        for (uint i = 0; i < rewards.length; i++) {
            RewardRound cur_round = base_details.rewardRounds[i];
            if (cur_round.totalReward > 0 && rewards[i] > 0) {
                user_token_reward += uint128((((rewards[i] * SCALING_FACTOR) / cur_round.totalReward) * cur_round.rewardTokens) / SCALING_FACTOR);
            }
        }

        user_token_reward = math.min(user_token_reward, base_details.rewardTokenBalance);
        base_details.rewardTokenBalance -= user_token_reward;

        emit RewardClaimed(user, user_token_reward);

        if (user_token_reward > 0) {
            TvmCell _empty;
            ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                user_token_reward, user, 0, send_gas_to, true, _empty
            );
        } else {
            send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
        }
    }


    // user_amount and user_reward_debt should be fetched from UserData at first
    function pendingReward(uint256 user_token_balance, IUserData.RewardRoundData[] user_reward_data) external view responsible returns (uint256) {
        RewardRound[] _reward_rounds = base_details.rewardRounds;
        // sync rewards up to this moment
        if (now > base_details.lastRewardTime && base_details.tokenBalance > 0) {
            // if token balance if empty, no need to update pool info
            uint128 new_reward = (now - base_details.lastRewardTime) * relay_config.userRewardPerSecond;
            _reward_rounds[_reward_rounds.length - 1].totalReward += new_reward;
            _reward_rounds[_reward_rounds.length - 1].accRewardPerShare += (new_reward * SCALING_FACTOR) / base_details.tokenBalance;
        }

        uint256 user_reward_tokens = 0;
        for (uint i = 0; i < _reward_rounds.length; i++) {
            // for old user rounds (which synced already), just get rewards
            if (i < user_reward_data.length - 1) {
                // totalReward in old round cant be empty
                uint256 user_round_share = (user_reward_data[i].reward_balance * SCALING_FACTOR) / _reward_rounds[i].totalReward;
                user_reward_tokens += (user_round_share * _reward_rounds[i].rewardTokens) / SCALING_FACTOR;
            // sync new user rounds
            } else {
                if (i >= user_reward_data.length) {
                    user_reward_data.push(IUserData.RewardRoundData(0, 0));
                }

                if (_reward_rounds[i].totalReward > 0) {
                    uint256 new_reward = ((user_token_balance * _reward_rounds[i].accRewardPerShare) / SCALING_FACTOR) - user_reward_data[i].reward_debt;
                    uint256 user_round_reward = user_reward_data[i].reward_balance + new_reward;
                    uint256 user_round_share = (user_round_reward * SCALING_FACTOR) / _reward_rounds[i].totalReward;
                    user_reward_tokens += (user_round_share * _reward_rounds[i].rewardTokens) / SCALING_FACTOR;
                }
            }
        }
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } user_reward_tokens;
    }

    function updatePoolInfo() internal {
        if (now <= base_details.lastRewardTime) {
            return;
        }

        if (base_details.tokenBalance == 0) {
            base_details.lastRewardTime = now;
            return;
        }

        uint128 multiplier = now - base_details.lastRewardTime;
        uint128 new_reward = relay_config.userRewardPerSecond * multiplier;
        base_details.rewardRounds[base_details.rewardRounds.length - 1].totalReward += new_reward;
        base_details.lastRewardTime = now;

        base_details.rewardRounds[base_details.rewardRounds.length - 1].accRewardPerShare += (new_reward * SCALING_FACTOR) / base_details.tokenBalance;
    }

    function _buildUserDataParams(address user) private view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(user);
        return builder.toCell();
    }

    function _buildInitData(uint8 type_id, TvmCell _initialData) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: address(this),
                platformType: type_id,
                initialData: _initialData,
                platformCode: code_data.platform_code
            },
            pubkey: 0,
            code: code_data.platform_code
        });
    }

    function deployUserData(address user_data_owner) internal returns (address) {
        TvmBuilder constructor_params;
        constructor_params.store(code_data.user_data_version);
        constructor_params.store(code_data.user_data_version);
        constructor_params.store(base_details.dao_root);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.UserData, _buildUserDataParams(user_data_owner)),
            value: Gas.DEPLOY_USER_DATA_MIN_VALUE
        }(code_data.user_data_code, constructor_params.toCell(), user_data_owner);
    }

    function getUserDataAddress(address user) public view responsible returns (address) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } address(tvm.hash(_buildInitData(
            PlatformTypes.UserData,
            _buildUserDataParams(user)
        )));
    }

    function castVote(uint32 proposal_id, bool support) public view override {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!base_details.emergency, ErrorCodes.EMERGENCY);
        _castVote(proposal_id, support, '');
    }

    function castVoteWithReason(
        uint32 proposal_id,
        bool support,
        string reason
    ) public view override {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!base_details.emergency, ErrorCodes.EMERGENCY);
        _castVote(proposal_id, support, reason);
    }

    function _castVote(uint32 proposal_id, bool support, string reason) private view {
        tvm.rawReserve(_reserve(), 0);
        IUserData(getUserDataAddress(msg.sender)).castVote{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(code_data.user_data_version, proposal_id, support, reason);
    }

    function tryUnlockVoteTokens(uint32 proposal_id) public view override {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!base_details.emergency, ErrorCodes.EMERGENCY);
        tvm.rawReserve(_reserve(), 0);

        IUserData(getUserDataAddress(msg.sender)).tryUnlockVoteTokens{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(code_data.user_data_version, proposal_id);

    }

    function tryUnlockCastedVotes(uint32[] proposal_ids) public view override {
        require (!base_details.emergency, ErrorCodes.EMERGENCY);
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        IUserData(getUserDataAddress(msg.sender)).tryUnlockCastedVotes{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(code_data.user_data_version, proposal_ids);
    }

    function withdrawTonsUserEmergency() external {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (base_details.emergency, ErrorCodes.EMERGENCY);

        tvm.rawReserve(_reserve(), 0);

        address user_data = getUserDataAddress(msg.sender);
        IUserData(user_data).withdrawTons{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }();
    }

    function withdrawTonsEmergency(uint128 amount, address receiver, bool all, address send_gas_to) external onlyRescuer {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (base_details.emergency, ErrorCodes.EMERGENCY);
        require (address(this).balance > amount, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(Gas.ROOT_INITIAL_BALANCE, 0);

        if (all) {
            // we assume that max ROOT_INITIAL_BALANCE was spent
            send_gas_to.transfer({ value: Gas.MIN_CALL_MSG_VALUE - Gas.ROOT_INITIAL_BALANCE, bounce: false });
            receiver.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            receiver.transfer({ value: amount, bounce: false });
            // we assume that max ROOT_INITIAL_BALANCE was spent
            send_gas_to.transfer({ value: Gas.MIN_CALL_MSG_VALUE - Gas.ROOT_INITIAL_BALANCE, bounce: false });
        }
    }

    // amount is ignored if all==True
    function withdrawTokensEmergency(uint128 amount, address receiver, bool all, address send_gas_to) external onlyRescuer {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (base_details.emergency, ErrorCodes.EMERGENCY);
        tvm.rawReserve(_reserve(), 0);

        // try sending all tokens
        if (all) {
            amount = base_details.tokenBalance + base_details.rewardTokenBalance;
        }

        uint128 remaining_amount = amount;
        if (remaining_amount >= base_details.tokenBalance) {
            base_details.tokenBalance = 0;
            remaining_amount -= base_details.tokenBalance;
        } else {
            base_details.tokenBalance -= remaining_amount;
            remaining_amount = 0;
        }

        if (remaining_amount >= base_details.rewardTokenBalance) {
            base_details.rewardTokenBalance = 0;
        } else {
            base_details.rewardTokenBalance -= remaining_amount;
        }

        TvmCell _empty;
        ITokenWallet(base_details.tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            amount, receiver, 0, send_gas_to, true, _empty
        );
    }

    function setEmergency(bool _emergency, address send_gas_to) external onlyRescuer {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        base_details.emergency = _emergency;
        emit Emergency(_emergency);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    onBounce(TvmSlice slice) external {
        tvm.accept();

        uint32 functionId = slice.decode(uint32);
        // if processing failed - contract was not deployed. Deploy and try again
        if (functionId == tvm.functionId(UserData.processDeposit)) {
            tvm.rawReserve(_reserve(), 0);

            uint64 _deposit_nonce = slice.decode(uint64);
            PendingDeposit deposit = deposits[_deposit_nonce];
            address user_data_addr = deployUserData(deposit.user);
            // try again
            UserData(user_data_addr).processDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                _deposit_nonce, deposit.amount, base_details.rewardRounds, code_data.user_data_version
            );
        }
    }

    modifier onlyRescuer() {
        require (msg.sender == base_details.rescuer, ErrorCodes.NOT_RESCUER);
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != base_details.admin) {
            checkDelegate();
        }
        _;
    }

    modifier onlyEthTonConfig() {
        require (msg.sender == base_details.bridge_event_config_eth_ton, ErrorCodes.NOT_BRIDGE);
        _;
    }

    modifier onlyDaoRoot {
        require(msg.sender == base_details.dao_root, ErrorCodes.NOT_DAO_ROOT);
        _;
    }

    modifier onlyRewarder {
        require(msg.sender == base_details.rewarder, ErrorCodes.NOT_REWARDER);
        _;
    }

    modifier onlyUserData(address user) {
        address expectedAddr = getUserDataAddress(user);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_USER_DATA);
        _;
    }

    modifier onlyActive() {
        require(active, ErrorCodes.NOT_ACTIVE);
        _;
    }

}
