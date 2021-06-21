pragma ton-solidity ^0.39.0;

interface IRelayRound {
    struct Relay {
        address staker_addr;
        uint256 ton_pubkey;
        uint256 eth_addr;
        uint128 staked_tokens;
    }

    struct RelayRoundDetails {
        address root;
        uint128 round_num;
        Relay[] relays;
        bool relays_installed;
        uint32 code_version;
    }

    function setRelays(Relay[] _relay_list, address send_gas_to) external;
}
