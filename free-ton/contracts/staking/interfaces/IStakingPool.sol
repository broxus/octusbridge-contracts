pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;

import "./IElection.sol";
import "./IRelayRound.sol";


interface IStakingPool {
    struct RewardRound {
        uint256 accRewardPerShare;
        uint128 rewardTokens;
        uint128 totalReward;
        uint32 startTime;
    }

    struct BaseDetails {
        address dao_root;
        address bridge_event_config_eth_ton;
        address bridge_event_config_ton_eth;
        address tokenRoot;
        address tokenWallet;
        address admin;
        address rewarder;
        uint128 tokenBalance;
        uint128 rewardTokenBalance;
        uint128 rewardPerSecond;
        uint32 lastRewardTime;
        RewardRound[] rewardRounds;
    }

    struct RelayConfigDetails {
        uint32 relayLockTime;
        uint32 relayRoundTime;
        uint32 electionTime;
        uint32 timeBeforeElection;
        uint32 relaysCount;
        uint32 minRelaysCount;
        uint128 minRelayDeposit;
        uint128 relayInitialDeposit;
    }

    struct CodeData {
        TvmCell platform_code;
        bool has_platform_code;
        TvmCell user_data_code;
        uint32 user_data_version;
        TvmCell election_code;
        uint32 election_version;
        TvmCell relay_round_code;
        uint32 relay_round_version;
    }

    struct RelayRoundsDetails {
        bool originRelayRoundInitialized;
        uint32 currentRelayRound;
        uint32 currentRelayRoundStartTime;
        uint32 currentElectionStartTime;
        uint32 prevRelayRoundEndTime;
        uint32 pendingRelayRound;
    }

    function finishDeposit(uint64 _nonce) external;
    function finishWithdraw(address user, uint128 withdrawAmount, address send_gas_to) external;
    function finishClaimReward(address user, uint128[] rewards, address send_gas_to) external;
    function revertDeposit(uint64 _nonce) external;
    function onElectionStarted(uint32 round_num, address send_gas_to) external;
    function onElectionEnded(uint32 round_num, uint32 relay_requests_count) external;
    function processBecomeRelayNextRound(address user) external view;
    function processGetRewardForRelayRound(address user, uint32 round_num) external;
    function confirmSlash(
        address user,
        uint128[] ban_rewards,
        uint128[] reward_debts,
        uint128 ban_token_balance,
        address send_gas_to
    ) external;
    function onRelayRoundDeployed(
        uint32 round_num,
        bool duplicate
    ) external;
    function onRelayRoundInitialized(
        uint32 round_num,
        uint32 relays_count,
        uint128 round_reward,
        bool duplicate,
        uint160[] eth_keys
    ) external;
}
