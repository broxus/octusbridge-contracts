pragma ton-solidity >= 0.39.0;


interface IElection {
    function applyForMembership(
        address staker_addr,
        uint256 ton_pubkey,
        uint160 eth_address,
        uint128 tokens,
        uint32 lock_time,
        uint32 election_code_version
    ) external;
    function finish(uint32 code_version) external;
    function sendRelaysToRelayRound(address relay_round_addr, uint32 relays_count) external;
}
