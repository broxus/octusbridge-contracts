pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

import "./IElection.sol";
import "./IRelayRound.sol";


interface IStakingPool {
    struct RewardRound {
        uint256 accRewardPerShare;
        uint128 rewardTokens;
        uint128 totalReward;
        uint128 startTime;
    }

    function finishDeposit(uint64 _nonce) external;
    function finishWithdraw(address user, uint128 withdrawAmount, address send_gas_to) external;
    function finishClaimReward(address user, uint128[] rewards, address send_gas_to) external;
    function revertDeposit(uint64 _nonce) external;
    function becomeRelayNextRound(address send_gas_to) external;
    function startElectionOnNewRound(address send_gas_to) external;
    function endElection(address send_gas_to) external;
    function onElectionStarted(uint128 round_num, address send_gas_to) external;
    function onElectionEnded(uint128 round_num, IElection.MembershipRequest[] requests, address send_gas_to) external;
    function onRelayRoundInitialized(
        uint128 round_num,
        IRelayRound.Relay[] relays,
        address send_gas_to
    ) external;
}
