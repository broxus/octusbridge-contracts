pragma ton-solidity ^0.39.0;


interface IElection {
    struct MembershipRequest {
        address ton_addr;
        uint256 eth_addr;
        uint128 tokens;
    }

    function applyForMembership(
        address ton_addr,
        uint256 eth_addr,
        uint128 tokens,
        address send_gas_to,
        uint32 election_code_version
    ) external;
    function finish(uint128 relays_count, address send_gas_to) external;
}
