pragma ton-solidity ^0.39.0;
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

    function finishDeposit(uint64 _nonce) external;
    function finishWithdraw(address user, uint128 withdrawAmount, address send_gas_to) external;
    function finishClaimReward(address user, uint128[] rewards, address send_gas_to) external;
    function revertDeposit(uint64 _nonce) external;
    function endElection(address send_gas_to) external;
    function onElectionStarted(uint32 round_num, address send_gas_to) external;
    function onElectionEnded(uint32 round_num, uint32 relay_requests_count, address send_gas_to) external;
    function processBecomeRelayNextRound(address user) external view;
    function processGetRewardForRelayRound(address user, uint32 round_num) external;
    function confirmSlash(
        address user,
        uint128[] ban_rewards,
        uint128 ban_token_balance,
        address send_gas_to
    ) external;
    function onRelayRoundDeployed(
        uint32 round_num,
        bool duplicate,
        address send_gas_to
    ) external;
    function onRelayRoundInitialized(
        uint32 round_num,
        uint32 relays_count,
        uint128 round_reward,
        bool duplicate,
        address send_gas_to
    ) external;
}
