pragma ton-solidity ^0.39.0;


interface IElection {
    function applyForMembership(
        address staker_addr,
        uint256 ton_pubkey,
        uint160 eth_address,
        uint128 tokens,
        uint128 lock_time,
        address send_gas_to,
        uint32 election_code_version
    ) external;
    function finish(address send_gas_to, uint32 code_version) external;
    function sendRelaysToRelayRound(address relay_round_addr, uint128 relays_count, address send_gas_to) external;
}
