pragma ton-solidity ^0.39.0;


import "./StakingBase.sol";


abstract contract StakingPoolUpgradable is StakingPoolBase {
    function installPlatformOnce(TvmCell code, address send_gas_to) external onlyAdmin {
        // can be installed only once
        require(!has_platform_code, ErrorCodes.PLATFORM_CODE_NON_EMPTY);
        tvm.rawReserve(_reserve(), 2);
        platform_code = code;
        has_platform_code = true;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateUserDataCode(TvmCell code, address send_gas_to) external onlyAdmin {
        tvm.rawReserve(_reserve(), 2);
        user_data_code = code;
        user_data_version++;
        emit UserDataCodeUpgraded(user_data_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateElectionCode(TvmCell code, address send_gas_to) external onlyAdmin {
        tvm.rawReserve(_reserve(), 2);
        election_code = code;
        election_version++;
        emit ElectionCodeUpgraded(election_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateRelayRoundCode(TvmCell code, address send_gas_to) external onlyAdmin {
        tvm.rawReserve(_reserve(), 2);
        relay_round_code = code;
        relay_round_version++;
        emit RelayRoundCodeUpgraded(relay_round_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    // user should call this by himself
    function upgradeUserData(address send_gas_to) external view onlyActive {
        require(msg.value >= Gas.UPGRADE_USER_DATA_MIN_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        _upgradeUserData(msg.sender, 0, send_gas_to);
    }

    function forceUpgradeUserData(
        address user,
        address send_gas_to
    ) external view onlyAdmin {
        require(msg.value >= Gas.UPGRADE_USER_DATA_MIN_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        _upgradeUserData(user, 0, send_gas_to);
    }

    function _upgradeUserData(address user, uint128 gas_value, address send_gas_to) internal view {
        emit RequestedUserDataUpgrade(user);
        address user_data = getUserDataAddress(user);
        uint16 flag = 0;
        if (gas_value == 0) {
            flag = MsgFlag.ALL_NOT_RESERVED;
        }
        IUpgradableByRequest(user_data).upgrade{ value: gas_value, flag: flag }(
            user_data_code,
            user_data_version,
            send_gas_to
        );
    }

    function upgradeElection(
        uint32 round_num,
        address send_gas_to
    ) external view onlyAdmin {
        require(msg.value >= Gas.UPGRADE_ELECTION_MIN_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedElectionUpgrade(round_num);
        IUpgradableByRequest(getElectionAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            election_code, election_version, send_gas_to
        );
    }

    function upgradeRelayRound(
        uint32 round_num,
        address send_gas_to
    ) external view onlyAdmin {
        require(msg.value >= Gas.UPGRADE_RELAY_ROUND_MIN_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedRelayRoundUpgrade(round_num);
        IUpgradableByRequest(getRelayRoundAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            relay_round_code, relay_round_version, send_gas_to
        );
    }

    function _buildElectionParams(uint32 round_num) internal inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint32 round_num) internal inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function getElectionAddress(uint32 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function getRelayRoundAddress(uint32 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        )));
    }

    function getRelayRoundAddressFromTimestamp(uint32 time) public view responsible returns (address) {
        uint32 round_num = time < prevRelayRoundEndTime ? currentRelayRound - 1 : currentRelayRound;
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } getRelayRoundAddress(round_num);
    }

    function upgrade(TvmCell code, address send_gas_to) external onlyAdmin {
        tvm.rawReserve(_reserve(), 2);

        TvmBuilder main_builder;

        main_builder.store(send_gas_to);

        // CODES AND RELATED DATA
        TvmBuilder codes_builder;
        codes_builder.store(has_platform_code); // bool
        codes_builder.store(user_data_version); // 32
        codes_builder.store(election_version); // 32
        codes_builder.store(relay_round_version); // 32

        codes_builder.store(platform_code); // ref1
        codes_builder.store(user_data_code); // ref2
        codes_builder.store(election_code); // ref3
        codes_builder.store(relay_round_code); // ref4

        main_builder.storeRef(codes_builder);

        TvmBuilder data_builder_1;
        // MAIN DATA 1
        data_builder_1.store(deploy_nonce); // 32
        data_builder_1.store(deployer); // 256
        data_builder_1.store(dao_root); // 256
        data_builder_1.store(bridge_event_config); // 256
        data_builder_1.store(active); // 1
        data_builder_1.store(originRelayRoundInitialized); // 1
        data_builder_1.store(currentRelayRound); // 32
        data_builder_1.store(currentRelayRoundStartTime); // 32
        data_builder_1.store(currentElectionStartTime); // 32

        TvmBuilder data_builder_2;
        data_builder_2.store(bridge_event_proxy); // 256
        data_builder_2.store(prevRelayRoundEndTime); // 32
        data_builder_2.store(pendingRelayRound); // 32
        data_builder_2.store(lastRewardTime); // 32
        data_builder_2.store(tokenRoot); // 256
        data_builder_2.store(tokenWallet); // 256
        data_builder_2.store(rewardRounds); // ref

        TvmBuilder data_builder_3;
        data_builder_3.store(tokenBalance); // 128
        data_builder_3.store(rewardTokenBalance); // 128
        data_builder_3.store(admin); // 256
        data_builder_3.store(rewarder); // 256
        data_builder_3.store(rewardPerSecond); // 128

        TvmBuilder data_builder_4;
        data_builder_4.store(relayRoundTime); // 32
        data_builder_4.store(electionTime); // 32
        data_builder_4.store(timeBeforeElection); // 32
        data_builder_4.store(relaysCount); // 32
        data_builder_4.store(minRelaysCount); // 32
        data_builder_4.store(minRelayDeposit); // 128
        data_builder_4.store(relayInitialDeposit); // 128
        data_builder_4.store(deposit_nonce); // 64
        data_builder_4.store(deposits); // ref

        TvmBuilder data_builder;
        data_builder.storeRef(data_builder_1);
        data_builder.storeRef(data_builder_2);
        data_builder.storeRef(data_builder_3);
        data_builder.storeRef(data_builder_4);

        main_builder.storeRef(data_builder);

        // set code after complete this method
        tvm.setcode(code);

        // run onCodeUpgrade from new code
        tvm.setCurrentCode(code);
        onCodeUpgrade(main_builder.toCell());
    }

    /*
    upgrade_data
        bits:
            address send_gas_to
        refs:
            1: codes_data
                bits:
                    bool has_platform_code
                    uint32 user_data_version
                    uint32 election_version
                    uint32 relay_round_version
                refs:
                    1. platform_code
                    2. user_data_code
                    3. election_code
                    4. relay_round_code
            2: main_data
                refs:
                    1: data_1
                        bits:
                            uint32 deploy_nonce
                            address deployer
                            address dao_root
                            address bridge
                            bool active
                            bool originRelayRoundInitialized
                            uint32 currentRelayRound
                            uint32 currentRelayRoundStartTime
                            uint32 currentElectionStartTime
                    2: data_2
                        bits:
                            address bridge_event_proxy
                            uint32 prevRelayRound
                            EndTime
                            uint32 pendingRelayRound
                            uint32 lastRewardTime
                            address tokenRoot
                            address tokenWallet
                        refs:
                            1: rewardRounds
                    3: data_3
                        bits:
                            uint128 tokenBalance
                            uint128 rewardTokenBalance
                            address admin
                            address rewarder
                            uint128 rewardPerSecond
                    4: data_4
                        bits:
                            uint32 relayRoundTime
                            uint32 electionTime
                            uint32 timeBeforeElection
                            uint32 relaysCount
                            uint32 minRelaysCount
                            uint128 minRelayDeposit
                            uint128 relayInitialDeposit
                            uint64 deposit_nonce
                        refs:
                            1: deposits
*/

    function onCodeUpgrade(TvmCell upgrade_data) private {}
}
