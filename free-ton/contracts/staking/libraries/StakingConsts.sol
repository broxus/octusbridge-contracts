pragma ton-solidity ^0.39.0;


library  StakingConsts {
    // State vars
    uint256 constant public rewardPerSecond = 1000;

    uint128 constant public relayRoundTime = 7 days;

    uint128 constant public electionTime = 2 days;

    // election should start at lest after this much time before round end
    uint128 constant public timeBeforeElection = 4 days;

    uint64 constant public relaysCount = 10;

    // payloads for token receive callback
    uint8 public constant STAKE_DEPOSIT = 0;
    uint8 public constant REWARD_UP = 1;
}
