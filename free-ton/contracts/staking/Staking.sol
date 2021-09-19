pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;
pragma AbiHeader expire;

import "./base/StakingRelay.sol";

contract Staking is StakingPoolRelay {
    constructor(
        address _admin,
        address _dao_root,
        address _rewarder,
        address _rescuer,
        address _bridge_event_config_eth_ton,
        address _bridge_event_config_ton_eth,
        address _tokenRoot
    ) public {
        tvm.accept();

        base_details.tokenRoot = _tokenRoot;
        base_details.bridge_event_config_eth_ton = _bridge_event_config_eth_ton;
        base_details.bridge_event_config_ton_eth = _bridge_event_config_ton_eth;
        base_details.admin = _admin;
        base_details.dao_root = _dao_root;
        base_details.rescuer = _rescuer;
        base_details.rewarder = _rewarder;
        base_details.rewardRounds.push(RewardRound(0, 0, 0, now));
        setUpTokenWallets();
    }

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
                            address bridge_event_config_eth_ton
                            bool active
                            uint32 currentRelayRound
                            uint32 currentRelayRoundStartTime
                            uint32 currentRelayRoundEndTime
                            uint32 currentElectionStartTime
                            uint32 lastExtCall
                            bool currentElectionEnded
                    2: data_2
                        bits:
                            address bridge_event_config_ton_eth
                            uint32 prevRelayRoundEndTime
                            uint32 lastRewardTime
                            address tokenRoot
                            address tokenWallet
                            uint128 tokenBalance
                            bool emergency
                        refs:
                            1: rewardRounds
                    3: data_3
                        bits:
                            uint128 rewardTokenBalance
                            address admin
                            address rewarder
                            address rescuer
                    4: data_4
                        bits:
                            uint32 relayLockTime
                            uint32 relayRoundTime
                            uint32 electionTime
                            uint32 timeBeforeElection
                            uint32 minRoundGapTime
                            uint16 relaysCount
                            uint16 minRelaysCount
                            uint128 minRelayDeposit
                            uint128 relayInitialDeposit
                            uint128 tonEventDeployValue
                            uint64 deposit_nonce
                        refs:
                            1: deposits
*/

    function onCodeUpgrade(TvmCell upgrade_data) private {}
}
