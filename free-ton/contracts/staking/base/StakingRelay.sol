pragma ton-solidity ^0.39.0;


import "./StakingUpgradable.sol";


abstract contract StakingPoolRelay is StakingPoolUpgradable {
    function linkRelayAccounts(uint256 ton_pubkey, uint256 eth_address, address send_gas_to) external view onlyActive {
        require (msg.value >= Gas.MIN_LINK_RELAY_ACCS_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(msg.sender);
        IUserData(user_data).processLinkRelayAccounts{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            ton_pubkey, eth_address, send_gas_to, user_data_version
        );
    }

    function confirmEthAccount(address staker_addr, uint256 eth_address, address send_gas_to) external view onlyBridge {
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

    function createOriginRelayRound(IRelayRound.Relay[] relays, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_ORIGIN_ROUND_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (!originRelayRoundInitialized, ErrorCodes.ORIGIN_ROUND_ALREADY_INITIALIZED);

        tvm.rawReserve(_reserve(), 2);

        // we have 0 relay rounds at the moment
        address relay_round = deployRelayRound(currentRelayRound + 1, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(relays, send_gas_to);
    }

    function becomeRelayNextRound(address send_gas_to) external view onlyActive {
        require (msg.value >= Gas.MIN_RELAY_REQ_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (pendingRelayRound != 0, ErrorCodes.ELECTION_NOT_STARTED);
        tvm.rawReserve(_reserve(), 2);

        uint128 lock_time = electionTime + relayRoundTime * 3;

        address userDataAddr = getUserDataAddress(msg.sender);
        UserData(userDataAddr).processBecomeRelay{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            pendingRelayRound, lock_time, send_gas_to, user_data_version, election_version
        );
    }

    function getRewardForRelayRound(uint128 round_num, address send_gas_to) external view onlyActive {
        require (msg.value >= Gas.MIN_GET_REWARD_RELAY_ROUND_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        address userDataAddr = getUserDataAddress(msg.sender);
        UserData(userDataAddr).processGetRelayRewardForRound{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            rewardRounds, round_num, send_gas_to, user_data_version, relay_round_version
        );
    }

    function startElectionOnNewRound(address send_gas_to) external onlyActive {
        require (msg.value >= Gas.MIN_START_ELECTION_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (now >= (currentRelayRoundStartTime + timeBeforeElection), ErrorCodes.TOO_EARLY_FOR_ELECTION);
        require (currentElectionStartTime == 0, ErrorCodes.ELECTION_ALREADY_STARTED);
        require (originRelayRoundInitialized, ErrorCodes.ORIGIN_ROUND_NOT_INITIALIZED);
        tvm.rawReserve(_reserve(), 2);

        deployElection(currentRelayRound + 1, send_gas_to);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function endElection(address send_gas_to) external override onlyActive {
        require (msg.value >= Gas.MIN_END_ELECTION_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        require (currentElectionStartTime != 0, ErrorCodes.ELECTION_NOT_STARTED);
        require (now >= (currentElectionStartTime + electionTime), ErrorCodes.CANT_END_ELECTION);
        tvm.rawReserve(_reserve(), 2);

        address election_addr = getElectionAddress(pendingRelayRound);
        IElection(election_addr).finish{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(relaysCount, send_gas_to, election_version);
    }

    function onElectionStarted(uint128 round_num, address send_gas_to) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentElectionStartTime = now;
        pendingRelayRound = round_num;
        emit ElectionStarted(round_num);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function onElectionEnded(
        uint128 round_num,
        IElection.MembershipRequest[] win_requests,
        address send_gas_to
    ) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentElectionStartTime = 0;
        pendingRelayRound = 0;
        emit ElectionEnded(round_num);

        if (win_requests.length < minRelaysCount) {
            address relay_round = getRelayRoundAddress(round_num - 1);
            IRelayRound(relay_round).getRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(send_gas_to);
            return;
        }

        IRelayRound.Relay[] new_relays = new IRelayRound.Relay[](win_requests.length);
        for (uint i = 0; i < win_requests.length; i++) {
            new_relays[i] = IRelayRound.Relay(
                win_requests[i].staker_addr, win_requests[i].ton_pubkey, win_requests[i].eth_addr, win_requests[i].tokens, false
            );
        }

        address relay_round = deployRelayRound(round_num, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(new_relays, send_gas_to);
    }

    function receiveRelayRoundRelays(
        uint128 round_num,
        IRelayRound.Relay[] _relays,
        address send_gas_to
    ) external override onlyRelayRound(round_num) {
        tvm.rawReserve(_reserve(), 2);

        address relay_round = deployRelayRound(round_num + 1, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(_relays, send_gas_to);
    }

    function onRelayRoundInitialized(
        uint128 round_num,
        IRelayRound.Relay[] relays,
        uint128 round_reward,
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

        emit RelayRoundInitialized(round_num, relays);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function deployElection(uint128 round_num, address send_gas_to) internal returns (address) {
        require(round_num > currentRelayRound, ErrorCodes.INVALID_ELECTION_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(election_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.Election, _buildElectionParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployRelayRound(uint128 round_num, address send_gas_to) internal returns (address) {
        require(round_num > currentRelayRound, ErrorCodes.INVALID_RELAY_ROUND_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(relay_round_version);
        constructor_params.store(relayRoundTime);
        constructor_params.store(uint128(rewardRounds.length - 1));
        constructor_params.store(rewardPerSecond);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.RelayRound, _buildRelayRoundParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    modifier onlyElection(uint128 round_num) {
        address expectedAddr = getElectionAddress(round_num);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_ELECTION);
        _;
    }

    modifier onlyRelayRound(uint128 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_RELAY_ROUND);
        _;
    }

}