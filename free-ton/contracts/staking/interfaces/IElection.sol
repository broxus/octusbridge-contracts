pragma ton-solidity ^0.39.0;


interface IElection {
    struct MembershipRequest {
        address staker_addr;
        uint256 ton_pubkey;
        uint256 eth_addr;
        uint128 tokens;
    }

    function applyForMembership(
        address staker_addr,
        uint256 ton_pubkey,
        uint256 eth_address,
        uint128 tokens,
        uint128 lock_time,
        address send_gas_to,
        uint32 election_code_version
    ) external;
    function finish(uint128 relays_count, address send_gas_to, uint32 code_version) external;
}
