pragma ton-solidity ^0.39.0;


import "./StakingUpgradable.sol";


abstract contract StakingPoolRelay is StakingPoolUpgradable {
    function linkRelayAccounts(uint256 ton_pubkey, uint256 eth_address, address send_gas_to) external {
        require (msg.value >= Gas.MIN_LINK_RELAY_ACCS_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(msg.sender);
        IUserData(user_data).processLinkRelayAccounts{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            ton_pubkey, eth_address, send_gas_to, user_data_version
        );
    }

    function confirmEthAccount(address staker_addr, uint256 eth_address) external onlyBridge {
        require (msg.value >= Gas.MIN_CONFIRM_ETH_RELAY_ACC, StakingErrors.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(staker_addr);
        IUserData(user_data).processConfirmEthAccount{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(eth_address);
    }

    function createOriginRelayRound(IRelayRound.Relay[] relays, address send_gas_to) external onlyOwner {
        require (msg.value >= Gas.MIN_ORIGIN_ROUND_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        require (!originRelayRoundInitialized, StakingErrors.ORIGIN_ROUND_ALREADY_INITIALIZED);

        tvm.rawReserve(_reserve(), 2);

        address relay_round = deployRelayRound(currentRelayRound, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(relays, send_gas_to);
    }

    function becomeRelayNextRound(address send_gas_to) external override onlyActive {
        require (msg.value >= Gas.MIN_RELAY_REQ_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        require (pendingRelayRound != 0, StakingErrors.ELECTION_NOT_STARTED);
        tvm.rawReserve(_reserve(), 2);

        uint128 lock_time = electionTime + relayRoundTime * 3;

        address userDataAddr = getUserDataAddress(msg.sender);
        UserData(userDataAddr).processBecomeRelay{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            pendingRelayRound, lock_time, send_gas_to, user_data_version, election_version
        );
    }

    function startElectionOnNewRound(address send_gas_to) external override onlyActive {
        require (msg.value >= Gas.MIN_START_ELECTION_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        require (now >= (currentRelayRoundStartTime + timeBeforeElection), StakingErrors.TOO_EARLY_FOR_ELECTION);
        require (currentElectionStartTime == 0, StakingErrors.ELECTION_ALREADY_STARTED);
        require (originRelayRoundInitialized, StakingErrors.ORIGIN_ROUND_NOT_INITIALIZED);
        tvm.rawReserve(_reserve(), 2);

        deployElection(currentRelayRound + 1, send_gas_to);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function endElection(address send_gas_to) external override onlyActive {
        require (msg.value >= Gas.MIN_END_ELECTION_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        require (currentElectionStartTime != 0, StakingErrors.ELECTION_NOT_STARTED);
        require (now >= (currentElectionStartTime + electionTime), StakingErrors.CANT_END_ELECTION);
        tvm.rawReserve(_reserve(), 2);

        address election_addr = getElectionAddress(pendingRelayRound);
        IElection(election_addr).finish{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(relaysCount, send_gas_to);
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

        IRelayRound.Relay[] new_relays = new IRelayRound.Relay[](win_requests.length);
        for (uint i = 0; i < win_requests.length; i++) {
            new_relays[i] = IRelayRound.Relay(
                win_requests[i].staker_addr, win_requests[i].ton_pubkey, win_requests[i].eth_addr, win_requests[i].tokens
            );
        }

        address relay_round = deployRelayRound(round_num, send_gas_to);
        IRelayRound(relay_round).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(new_relays, send_gas_to);
    }

    function onRelayRoundInitialized(
        uint128 round_num,
        IRelayRound.Relay[] relays,
        address send_gas_to
    ) external override onlyRelayRound(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentRelayRound = round_num;
        currentRelayRoundStartTime = now;

        emit RelayRoundInitialized(round_num, relays);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function deployElection(uint128 round_num, address send_gas_to) internal returns (address) {
        require(round_num > currentRelayRound, StakingErrors.INVALID_ELECTION_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(election_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.Election, _buildElectionParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployRelayRound(uint128 round_num, address send_gas_to) internal returns (address) {
        require(round_num > currentRelayRound, StakingErrors.INVALID_RELAY_ROUND_ROUND);

        TvmBuilder constructor_params;
        constructor_params.store(relay_round_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.RelayRound, _buildRelayRoundParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    modifier onlyElection(uint128 round_num) {
        address expectedAddr = getElectionAddress(round_num);
        require (expectedAddr == msg.sender, StakingErrors.NOT_ELECTION);
        _;
    }

    modifier onlyRelayRound(uint128 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, StakingErrors.NOT_RELAY_ROUND);
        _;
    }

}