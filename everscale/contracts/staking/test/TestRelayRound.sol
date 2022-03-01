pragma ton-solidity >= 0.57.0;



contract TestRelayRound {
    uint256[] ton_keys; // array of ton pubkeys
    uint160[] eth_addrs; // array of eth pubkeys
    address[] staker_addrs; // array of staker addrs
    uint128[] staked_tokens; // array of staked tokens
    mapping (address => uint256) addr_to_idx;
    uint128 public total_tokens_staked;
    uint32 public relays_count;

    uint128 min_gas = 2 ton;


    constructor() public {
        tvm.accept();
    }

    function setRelays(
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens
    ) external  {
        tvm.rawReserve(min_gas, 0);

        for (uint i = 0; i < _ton_keys.length; i++) {
            if (_staked_tokens[i] > 0) {
                ton_keys.push(_ton_keys[i]);
                eth_addrs.push(_eth_addrs[i]);
                staked_tokens.push(_staked_tokens[i]);
                staker_addrs.push(_staker_addrs[i]);

                addr_to_idx[_staker_addrs[i]] = staker_addrs.length - 1;
                total_tokens_staked += _staked_tokens[i];
                relays_count += 1;
            } else {
                break;
            }
        }
    }


}
