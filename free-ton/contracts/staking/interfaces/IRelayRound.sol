pragma ton-solidity >= 0.39.0;

interface IRelayRound {
    struct RelayRoundDetails {
        address root;
        uint32 round_num;
        uint256[] ton_keys;
        uint160[] eth_addrs;
        address[] staker_addrs;
        uint128[] staked_tokens;
        bool relays_installed;
        uint32 code_version;
    }

    function getDetails() external view responsible returns (RelayRoundDetails);
    function sendRelaysToRelayRound(address relay_round_addr, uint32 relays_count) external;
    function setRelays(
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens
    ) external;
    function setEmptyRelays() external;
    function getRewardForRound(address staker_addr, uint32 code_version) external;
}
