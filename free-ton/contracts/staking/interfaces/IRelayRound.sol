pragma ton-solidity ^0.39.0;

contract IRelayRound {
    struct Relay {
        address ton_addr;
        uint256 eth_addr;
        uint128 staked_tokens;
    }

    struct RelayRoundDetails {
        address root;
        uint128 round_num;
        Relay[] relay_list;
        bool relays_installed;
        uint32 code_version;
    }
}
