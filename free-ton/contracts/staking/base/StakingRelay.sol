pragma ton-solidity ^0.39.0;
pragma AbiHeader pubkey;
pragma AbiHeader expire;

import "./StakingUpgradable.sol";


abstract contract StakingPoolRelay is StakingPoolUpgradable {
    function linkRelayAccounts(uint256 ton_pubkey, uint160 eth_address) external view onlyActive {
        require (msg.value >= relayInitialDeposit, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        uint128 user_data_value = msg.value / 2;

        address user_data = getUserDataAddress(msg.sender);
        IUserData(user_data).processLinkRelayAccounts{ value: user_data_value }(
            ton_pubkey, eth_address, user_data_version
        );
    }

    function confirmEthAccount(address staker_addr, uint160 eth_address, address send_gas_to) external view onlyBridge {
        require (msg.value >= Gas.MIN_CONFIRM_ETH_RELAY_ACC_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(staker_addr);
        IUserData(user_data).processConfirmEthAccount{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(eth_address, send_gas_to);
    }

    function slashRelay(address relay_staker_addr, address send_gas_to) external onlyDaoRoot {
        require (msg.value >= Gas.MIN_CONFIRM_ETH_RELAY_ACC_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        updatePoolInfo();
        _upgradeUserData(relay_staker_addr, Gas.USER_DATA_UPGRADE_VALUE, send_gas_to);

        address user_data = getUserDataAddress(relay_staker_addr);
        IUserData(user_data).slash{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(rewardRounds, send_gas_to);
    }

    function confirmSlash(
        address user,
        uint128[] ban_rewards,
        uint128 ban_token_balance,
        address send_gas_to
    ) external override onlyUserData(user) {
        tvm.rawReserve(_reserve(), 2);

        updatePoolInfo();
        uint128 _tokens_withdrawn = 0;
        for (uint i = 0; i < ban_rewards.length; i++) {
            uint128 _ban_tokens = math.muldiv(
                math.muldiv(ban_rewards[i], 1e18, rewardRounds[i].totalReward),
                rewardRounds[i].rewardTokens,
                1e18
            );
            // transfer relay reward for reward round to the current reward round
            rewardRounds[rewardRounds.length - 1].rewardTokens += _ban_tokens;
            _tokens_withdrawn += _ban_tokens;
        }
        // transfer all staked tokens to current round reward balance
        rewardRounds[rewardRounds.length - 1].rewardTokens += ban_token_balance;
        tokenBalance -= ban_token_balance;
        _tokens_withdrawn += ban_token_balance;

        emit RelaySlashed(user, _tokens_withdrawn);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function createOriginRelayRound(
        address[] staker_addrs,
        uint256[] ton_pubkeys,
        uint160[] eth_addrs,
        uint128[] staked_tokens,
        address send_gas_to
    ) external onlyAdmin {
        require (msg.value >= Gas.MIN_ORIGIN_ROUND_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!originRelayRoundInitialized, ErrorCodes.ORIGIN_ROUND_ALREADY_INITIALIZED);
        bool correct_len = staker_addrs.length == ton_pubkeys.length;
        bool correct_len_1 = ton_pubkeys.length == eth_addrs.length;
        bool correct_len_2 = eth_addrs.length == staked_tokens.length;
        require (correct_len && correct_len_1 && correct_len_2, ErrorCodes.BAD_INPUT_ARRAYS);
        tvm.rawReserve(_reserve(), 2);

        IRelayRound.Relay[] relays = new IRelayRound.Relay[](staker_addrs.length);
        for (uint i = 0; i < staker_addrs.length; i++) {
            relays[i] = IRelayRound.Relay(staker_addrs[i], ton_pubkeys[i], eth_addrs[i], staked_tokens[i]);
        }

        // we have 0 relay rounds at the moment
        address empty = address.makeAddrNone();
        address relay_round = deployRelayRound(currentRelayRound + 1, false, 1, empty, empty, MsgFlag.SENDER_PAYS_FEES, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(relays, send_gas_to);
    }

    function processBecomeRelayNextRound(address user) external view override onlyActive onlyUserData(user) {
        require (pendingRelayRound != 0, ErrorCodes.ELECTION_NOT_STARTED);

        tvm.rawReserve(_reserve(), 2);

        uint32 lock_time = electionTime + 30 days;

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
        IElection(election_addr).finish{value: required_gas}(address(this), election_version);
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
        uint32 relay_requests_count,
        address send_gas_to
    ) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        bool min_relays_ok = relay_requests_count >= minRelaysCount;

        currentElectionStartTime = 0;
        pendingRelayRound = 0;

        emit ElectionEnded(round_num, relay_requests_count, min_relays_ok);

        uint8 packs_num = _relaysPacksCount();
        address election = msg.sender;
        address prev_relay_round = getRelayRoundAddress(round_num - 1);
        deployRelayRound(round_num, !min_relays_ok, packs_num, election, prev_relay_round, MsgFlag.ALL_NOT_RESERVED, send_gas_to);
    }

    function _relaysPacksCount() internal view returns (uint8) {
        uint8 packs_count = uint8(relaysCount / RELAY_PACK_SIZE);
        uint8 modulo = relaysCount % RELAY_PACK_SIZE > 0 ? 1 : 0;
        return packs_count + modulo;
    }

    function onRelayRoundDeployed(
        uint32 round_num,
        bool duplicate,
        address send_gas_to
    ) external override onlyRelayRound(round_num) {
        tvm.rawReserve(_reserve(), 2);

        if (!originRelayRoundInitialized) {
            // this is an origin round deployment
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
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
                        cur_round_addr, relaysCount % RELAY_PACK_SIZE, send_gas_to
                    );
                } else {
                    IRelayRound(relay_round_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, RELAY_PACK_SIZE, send_gas_to
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
                        cur_round_addr, relaysCount % RELAY_PACK_SIZE, send_gas_to
                    );
                } else {
                    IElection(election_addr).sendRelaysToRelayRound{value: Gas.MIN_SEND_RELAYS_MSG_VALUE}(
                        cur_round_addr, RELAY_PACK_SIZE, send_gas_to
                    );
                }
            }
        }

        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function onRelayRoundInitialized(
        uint32 round_num,
        uint32 relays_count,
        uint128 round_reward,
        bool duplicate,
        address send_gas_to
    ) external override onlyRelayRound(round_num) {
        tvm.rawReserve(_reserve(), 2);

        // looks like we are initializing origin relay round
        if (!originRelayRoundInitialized) {
            originRelayRoundInitialized = true;
        } else {
            prevRelayRoundEndTime = currentRelayRoundStartTime + relayRoundTime;
        }

        currentRelayRound = round_num;
        currentRelayRoundStartTime = now;
        rewardRounds[rewardRounds.length - 1].totalReward += round_reward;

        emit RelayRoundInitialized(round_num, now, msg.sender, relays_count, duplicate);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function deployElection(uint32 round_num, address send_gas_to) internal returns (address) {
        require(round_num > currentRelayRound, ErrorCodes.INVALID_ELECTION_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(election_version);
        constructor_params.store(election_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.Election, _buildElectionParams(round_num)),
            value: Gas.DEPLOY_ELECTION_MIN_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployRelayRound(
        uint32 round_num,
        bool duplicate,
        uint8 packs_num,
        address election_addr,
        address prev_relay_round_addr,
        uint16 msg_flag,
        address send_gas_to
    ) internal returns (address) {
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
        }(relay_round_code, constructor_params.toCell(), send_gas_to);
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