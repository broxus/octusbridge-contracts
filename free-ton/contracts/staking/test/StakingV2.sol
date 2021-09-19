pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;
pragma AbiHeader expire;

import "./../base/StakingRelay.sol";

contract StakingV2 is StakingPoolRelay {
    function upgrade(TvmCell code, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);

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
        data_builder_1.store(base_details.dao_root); // 256
        data_builder_1.store(base_details.bridge_event_config_eth_ton); // 256
        data_builder_1.store(active); // 1
        data_builder_1.store(round_details.currentRelayRound); // 32
        data_builder_1.store(round_details.currentRelayRoundStartTime); // 32
        data_builder_1.store(round_details.currentRelayRoundEndTime); // 32
        data_builder_1.store(round_details.currentElectionStartTime); // 32
        data_builder_1.store(lastExtCall); // 32
        data_builder_1.store(round_details.currentElectionEnded); // 1

        TvmBuilder data_builder_2;
        data_builder_2.store(base_details.bridge_event_config_ton_eth); // 256
        data_builder_2.store(round_details.prevRelayRoundEndTime); // 32
        data_builder_2.store(base_details.lastRewardTime); // 32
        data_builder_2.store(base_details.tokenRoot); // address
        data_builder_2.store(base_details.tokenWallet); // address
        data_builder_2.store(base_details.tokenBalance); // 128
        data_builder_2.store(base_details.emergency); // 1
        data_builder_2.store(base_details.rewardRounds); // ref

        TvmBuilder data_builder_3;
        data_builder_3.store(base_details.rewardTokenBalance); // 128
        data_builder_3.store(base_details.admin); // address
        data_builder_3.store(base_details.rewarder); // address
        data_builder_3.store(base_details.rescuer); // address

        TvmBuilder data_builder_4;
        data_builder_4.store(relay_config.relayLockTime); // 32
        data_builder_4.store(relay_config.relayRoundTime); // 32
        data_builder_4.store(relay_config.electionTime); // 32
        data_builder_4.store(relay_config.timeBeforeElection); // 32
        data_builder_4.store(relay_config.minRoundGapTime); // 32
        data_builder_4.store(relay_config.relaysCount); // 16
        data_builder_4.store(relay_config.minRelaysCount); // 16
        data_builder_4.store(relay_config.minRelayDeposit); // 128
        data_builder_4.store(relay_config.relayInitialDeposit); // 128
        data_builder_4.store(tonEventDeployValue); // 128
        data_builder_4.store(deposit_nonce); // 64
        data_builder_4.store(deposits); // mapping

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

    function fixBug() internal {
        uint32 round_num = 3;
        uint32 start_time = now;
        uint32 end_time = now + relay_config.relayRoundTime;
        uint32 relays_count = 3;
        bool duplicate = false;
        address round_addr = address.makeAddrStd(0, 0x4360eae61ced320262cbee9a3a1f0ffa3fd77e3588dad2636fa36f32537e18dd);

        round_details.currentElectionEnded = false;
        round_details.currentRelayRound = round_num;
        base_details.rewardRounds[base_details.rewardRounds.length - 1].totalReward += 1800000000;

        round_details.prevRelayRoundEndTime = start_time + relay_config.minRoundGapTime;

        uint160[] _eth_keys = [
            388372071333715408619434108176824072459686157040,
            511090786160396539834121296594726305719996749857,
            89341277446954992594224448302617155426158408959
        ];

        TvmBuilder event_builder;
        event_builder.store(round_num); // 32
        event_builder.store(_eth_keys); // ref
        event_builder.store(end_time);
        ITonEvent.TonEventVoteData event_data = ITonEvent.TonEventVoteData(tx.timestamp, now, event_builder.toCell());
        ITonEventConfiguration(base_details.bridge_event_config_ton_eth).deployEvent{value: tonEventDeployValue}(event_data);

        round_details.currentRelayRoundStartTime = start_time;
        round_details.currentRelayRoundEndTime = end_time;

        address election_addr = getElectionAddress(round_num);
        IElection(election_addr).destroy{value: Gas.DESTROY_MSG_VALUE}();

        address old_relay_round = getRelayRoundAddress(round_num - 3);
        IRelayRound(old_relay_round).destroy{value: Gas.DESTROY_MSG_VALUE}();

        emit RelayRoundInitialized(round_num, start_time, end_time, round_addr, relays_count, duplicate);
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        TvmSlice main = upgrade_data.toSlice();
        address send_gas_to = main.decode(address);

        TvmSlice codes_data = main.loadRefAsSlice();
        TvmSlice main_data = main.loadRefAsSlice();

        (
            has_platform_code,
            user_data_version,
            election_version,
            relay_round_version
        ) = codes_data.decode(bool, uint32, uint32, uint32);

        platform_code = codes_data.loadRef();
        user_data_code = codes_data.loadRef();
        election_code = codes_data.loadRef();
        relay_round_code = codes_data.loadRef();

        TvmSlice data_1 = main_data.loadRefAsSlice();
        TvmSlice data_2 = main_data.loadRefAsSlice();
        TvmSlice data_3 = main_data.loadRefAsSlice();
        TvmSlice data_4 = main_data.loadRefAsSlice();

        (
            deploy_nonce, // 32
            deployer, // address
            base_details.dao_root, // address
            base_details.bridge_event_config_eth_ton, // address
            active, // 1
            round_details.currentRelayRound, // 32
            round_details.currentRelayRoundStartTime, // 32
            round_details.currentRelayRoundEndTime, // 32
            round_details.currentElectionStartTime, // 32
            lastExtCall, // 32
            round_details.currentElectionEnded // 1
        ) = data_1.decode(
            uint32, address, address, address, bool, uint32, uint32, uint32, uint32, uint32, bool
        );

        (
            base_details.bridge_event_config_ton_eth, // address
            round_details.prevRelayRoundEndTime, // 32
            base_details.lastRewardTime, // 32
            base_details.tokenRoot, // address
            base_details.tokenWallet, // address
            base_details.tokenBalance, // 128
            base_details.emergency, // 1
            base_details.rewardRounds
        ) = data_2.decode(
            address, uint32, uint32, address, address, uint128, bool, RewardRound[]
        );

        (
            base_details.rewardTokenBalance, // 128
            base_details.admin, // address
            base_details.rewarder, // address
            base_details.rescuer // address
        ) = data_3.decode(
            uint128, address, address, address
        );

        (
            relay_config.relayLockTime, // 32
            relay_config.relayRoundTime, // 32
            relay_config.electionTime, // 32
            relay_config.timeBeforeElection, // 32
            relay_config.minRoundGapTime, // 32
            relay_config.relaysCount, // 16
            relay_config.minRelaysCount, // 16
            relay_config.minRelayDeposit, // 128
            relay_config.relayInitialDeposit, // 128
            tonEventDeployValue, // 128
            deposit_nonce, // 64
            deposits
        ) = data_4.decode(
            uint32, uint32, uint32, uint32, uint32, uint16, uint16, uint128, uint128, uint128, uint64, mapping (uint64 => PendingDeposit)
        );

        fixBug();
    }
}
