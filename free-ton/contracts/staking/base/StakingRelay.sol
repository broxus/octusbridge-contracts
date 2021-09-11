pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;
//pragma AbiHeader expire;

import "./StakingUpgradable.sol";
import "../interfaces/IEventProxy.sol";
import "../../bridge/interfaces/IProxy.sol";


abstract contract StakingPoolRelay is StakingPoolUpgradable, IProxy {
    function linkRelayAccounts(uint256 ton_pubkey, uint160 eth_address) external view onlyActive {
        require (msg.value >= relayInitialDeposit, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        uint128 user_data_value = msg.value / 2;

        address user_data = getUserDataAddress(msg.sender);
        IUserData(user_data).processLinkRelayAccounts{ value: user_data_value }(
            ton_pubkey, eth_address, false, user_data_version
        );
    }

    function broxusBridgeCallback(
        IEthereumEvent.EthereumEventInitData eventData,
        address gasBackAddress
    ) external override onlyEthTonConfig {
        require (msg.value >= Gas.MIN_CONFIRM_ETH_RELAY_ACC_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        (uint160 eth_addr, int8 wk_id, uint256 ton_addr_body) = eventData.voteData.eventData.toSlice().decode(uint160, int8, uint256);
        address ton_staker_addr = address.makeAddrStd(wk_id, ton_addr_body);
        confirmEthAccount(ton_staker_addr, eth_addr, gasBackAddress);
    }

    function confirmEthAccount(address staker_addr, uint160 eth_address, address send_gas_to) internal {
        address user_data = getUserDataAddress(staker_addr);
        IUserData(user_data).processConfirmEthAccount{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(eth_address, send_gas_to);
    }

    function slashRelay(address relay_staker_addr, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_SLASH_RELAY_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        updatePoolInfo();
        _upgradeUserData(relay_staker_addr, Gas.USER_DATA_UPGRADE_VALUE, send_gas_to);

        address user_data = getUserDataAddress(relay_staker_addr);
        IUserData(user_data).slash{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(rewardRounds, send_gas_to);
    }

    function _syncUserRewardData(
        uint128[] user_rewards,
        uint128[] user_debts,
        uint128 ban_token_balance
    ) private view returns (uint128[]) {
        for (uint i = user_rewards.length - 1; i < rewardRounds.length; i++) {
            if (i >= user_rewards.length) {
                user_rewards.push(0);
                user_debts.push(0);
            }
            user_rewards[i] += uint128(math.muldiv(ban_token_balance, rewardRounds[i].accRewardPerShare, 1e18) - user_debts[i]);
        }
        return user_rewards;
    }

    function confirmSlash(
        address user,
        uint128[] user_rewards,
        uint128[] user_debts,
        uint128 ban_token_balance,
        address send_gas_to
    ) external override onlyUserData(user) {
        tvm.rawReserve(_reserve(), 2);

        updatePoolInfo();
        // sync user rewards up to this moment
        uint128[] user_rewards_synced = _syncUserRewardData(user_rewards, user_debts, ban_token_balance);

        uint128 _tokens_withdraw_total = 0;
        uint128 _tokens_added_to_reward = 0;
        for (uint i = 0; i < user_rewards_synced.length; i++) {
            uint128 _ban_tokens = math.muldiv(
                math.muldiv(user_rewards_synced[i], 1e18, rewardRounds[i].totalReward),
                rewardRounds[i].rewardTokens,
                1e18
            );
            _tokens_added_to_reward += _ban_tokens;
            _tokens_withdraw_total += _ban_tokens;
        }
        // transfer all staked tokens to current round reward balance
        rewardRounds[rewardRounds.length - 1].rewardTokens += ban_token_balance;
        rewardRounds[rewardRounds.length - 1].rewardTokens += _tokens_added_to_reward;
        tokenBalance -= ban_token_balance;
        rewardTokenBalance += ban_token_balance;
        _tokens_withdraw_total += ban_token_balance;

        emit RelaySlashed(user, _tokens_withdraw_total);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function createOriginRelayRound(
        address[] staker_addrs,
        uint256[] ton_pubkeys,
        uint160[] eth_addrs,
        uint128[] staked_tokens,
        uint128 ton_deposit,
        address send_gas_to
    ) external onlyAdmin {
        require (msg.value >= Gas.MIN_ORIGIN_ROUND_MSG_VALUE + ton_deposit * staker_addrs.length, ErrorCodes.VALUE_TOO_LOW);
        require (!originRelayRoundInitialized, ErrorCodes.ORIGIN_ROUND_ALREADY_INITIALIZED);
        bool correct_len = staker_addrs.length == ton_pubkeys.length;
        bool correct_len_1 = ton_pubkeys.length == eth_addrs.length;
        bool correct_len_2 = eth_addrs.length == staked_tokens.length;
        require (correct_len && correct_len_1 && correct_len_2, ErrorCodes.BAD_INPUT_ARRAYS);
        tvm.rawReserve(_reserve(), 2);

        for (uint i = 0; i < staker_addrs.length; i++) {
            // manually confirm all relays
            address user_data_addr = getUserDataAddress(staker_addrs[i]);
            IUserData(user_data_addr).processLinkRelayAccounts{ value: 0.1 ton + ton_deposit }(ton_pubkeys[i], eth_addrs[i], true, user_data_version);
        }

        // we have 0 relay rounds at the moment
        address empty = address.makeAddrNone();
        address relay_round = deployRelayRound(currentRelayRound + 1, false, 1, empty, empty, MsgFlag.SENDER_PAYS_FEES);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            ton_pubkeys, eth_addrs, staker_addrs, staked_tokens
        );
    }

    function processBecomeRelayNextRound(address user) external view override onlyActive onlyUserData(user) {
        require (pendingRelayRound != 0, ErrorCodes.ELECTION_NOT_STARTED);

        tvm.rawReserve(_reserve(), 2);

        uint32 lock_time = electionTime + relayLockTime;

        IUserData(msg.sender).processBecomeRelayNextRound2{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            pendingRelayRound, lock_time, minRelayDeposit, user_data_version, election_version
        );
    }

    function processGetRewardForRelayRound(address user, uint32 round_num) external override onlyActive onlyUserData(user) {
        tvm.rawReserve(_reserve(), 2);
        updatePoolInfo();

        IUserData(msg.sender).processGetRewardForRelayRound2{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            rewardRounds, round_num, user_data_version, relay_round_version
        );
    }

    function startElectionOnNewRound() external onlyActive {
        require (now >= (currentRelayRoundStartTime + timeBeforeElection), ErrorCodes.TOO_EARLY_FOR_ELECTION);
        require (currentElectionStartTime == 0, ErrorCodes.ELECTION_ALREADY_STARTED);
        require (originRelayRoundInitialized, ErrorCodes.ORIGIN_ROUND_NOT_INITIALIZED);
        tvm.accept();

        deployElection(currentRelayRound + 1, address(this));
    }

    function endElection() external onlyActive {
        require (currentElectionStartTime != 0, ErrorCodes.ELECTION_NOT_STARTED);
        require (now >= (currentElectionStartTime + electionTime), ErrorCodes.CANT_END_ELECTION);
        tvm.accept();

        uint128 required_gas = Gas.MIN_END_ELECTION_MSG_VALUE + _relaysPacksCount() * Gas.MIN_SEND_RELAYS_MSG_VALUE;

        address election_addr = getElectionAddress(pendingRelayRound);
        IElection(election_addr).finish{value: required_gas}(election_version);
    }

    function onElectionStarted(uint32 round_num, address send_gas_to) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentElectionStartTime = now;
        pendingRelayRound = round_num;
        emit ElectionStarted(round_num, now, msg.sender);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function onElectionEnded(
        uint32 round_num,
        uint32 relay_requests_count
    ) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        bool min_relays_ok = relay_requests_count >= minRelaysCount;

        currentElectionStartTime = 0;
        pendingRelayRound = 0;

        emit ElectionEnded(round_num, relay_requests_count, min_relays_ok);

        uint8 packs_num = _relaysPacksCount();
        address election = msg.sender;
        address prev_relay_round = getRelayRoundAddress(round_num - 1);
        deployRelayRound(round_num, !min_relays_ok, packs_num, election, prev_relay_round, MsgFlag.ALL_NOT_RESERVED);
    }

    function _relaysPacksCount() private view returns (uint8) {
        uint8 packs_count = uint8(relaysCount / RELAY_PACK_SIZE);
        uint8 modulo = relaysCount % RELAY_PACK_SIZE > 0 ? 1 : 0;
        return packs_count + modulo;
    }

    function onRelayRoundDeployed(
        uint32 round_num,
        bool duplicate
    ) external override onlyRelayRound(round_num) {
        tvm.rawReserve(_reserve(), 2);

        if (!originRelayRoundInitialized) {
            // this is an origin round deployment
            return;
        }

        address cur_round_addr = msg.sender;
        if (duplicate) {
            // get relays from previous relay round
            address relay_round_addr = getRelayRoundAddress(round_num - 1);
            for (uint i = 0; i < _relaysPacksCount(); i++) {
                // last pack could be smaller then other ones
                if (i == _relaysPacksCount() - 1 && relaysCount % RELAY_PACK_SIZE > 0) {
                    IRelayRound(relay_round_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, relaysCount % RELAY_PACK_SIZE
                    );
                } else {
                    IRelayRound(relay_round_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, RELAY_PACK_SIZE
                    );
                }
            }
        } else {
            // get relays from current election
            address election_addr = getElectionAddress(round_num);
            for (uint i = 0; i < _relaysPacksCount(); i++) {
                // last pack could be smaller then other ones
                if (i == _relaysPacksCount() - 1 && relaysCount % RELAY_PACK_SIZE > 0) {
                    IElection(election_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, relaysCount % RELAY_PACK_SIZE
                    );
                } else {
                    IElection(election_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, RELAY_PACK_SIZE
                    );
                }
            }
        }
    }

    function onRelayRoundInitialized(
        uint32 round_num,
        uint32 round_start_time,
        uint32 round_end_time,
        uint32 relays_count,
        uint128 round_reward,
        bool duplicate,
        uint160[] eth_keys
    ) external override onlyRelayRound(round_num) {
        // this method is called with remaining balance from setRelays call of RelayRound which is lower than we need
        // so that we manually increase reservation
        // we know that balance of this contract is enough, because we checked that on 'endElection' call which triggers this action
        tvm.rawReserve(_reserve() - Gas.EVENT_DEPLOY_VALUE, 2);

        // looks like we are initializing origin relay round
        if (!originRelayRoundInitialized) {
            originRelayRoundInitialized = true;
        } else {
            prevRelayRoundEndTime = currentRelayRoundStartTime + relayRoundTime;
        }

        currentRelayRound = round_num;
        currentRelayRoundStartTime = round_start_time;
        rewardRounds[rewardRounds.length - 1].totalReward += round_reward;

        TvmBuilder event_builder;
        event_builder.store(round_num); // 32
        event_builder.store(eth_keys); // ref
        event_builder.store(round_end_time);
        ITonEvent.TonEventVoteData event_data = ITonEvent.TonEventVoteData(tx.timestamp, now, event_builder.toCell());
        IEventProxy(bridge_event_config_ton_eth).deployEvent{value: Gas.EVENT_DEPLOY_VALUE}(event_data);

        emit RelayRoundInitialized(round_num, round_start_time, round_end_time, msg.sender, relays_count, duplicate);
    }

    function deployElection(uint32 round_num, address send_gas_to) private returns (address) {
        require(round_num > currentRelayRound, ErrorCodes.INVALID_ELECTION_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(election_version);
        constructor_params.store(election_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.Election, _buildElectionParams(round_num)),
            value: Gas.DEPLOY_ELECTION_MIN_VALUE
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployRelayRound(
        uint32 round_num,
        bool duplicate,
        uint8 packs_num,
        address election_addr,
        address prev_relay_round_addr,
        uint16 msg_flag
    ) private returns (address) {
        require(round_num > currentRelayRound, ErrorCodes.INVALID_RELAY_ROUND_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(relay_round_version);
        constructor_params.store(relay_round_version);
        constructor_params.store(relayRoundTime);
        constructor_params.store(uint32(rewardRounds.length - 1));
        constructor_params.store(rewardPerSecond);
        constructor_params.store(duplicate);
        constructor_params.store(packs_num);
        constructor_params.store(election_addr);
        constructor_params.store(prev_relay_round_addr);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.RelayRound, _buildRelayRoundParams(round_num)),
            value: Gas.DEPLOY_RELAY_ROUND_MIN_VALUE,
            flag: msg_flag
        }(relay_round_code, constructor_params.toCell(), address(this));
    }

    modifier onlyElection(uint32 round_num) {
        address expectedAddr = getElectionAddress(round_num);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_ELECTION);
        _;
    }

    modifier onlyRelayRound(uint32 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_RELAY_ROUND);
        _;
    }

}
