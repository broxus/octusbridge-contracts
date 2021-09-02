pragma ton-solidity >= 0.39.0;

pragma AbiHeader pubkey;
pragma AbiHeader expire;


contract DummyRound {
    struct Relay {
        address staker_addr;
        uint256 ton_pubkey;
        uint160 eth_addr;
        uint128 staked_tokens;
    }
    uint256 static _randomNonce;
    Relay[] public relays;
    uint256[] public ton_keys;


    constructor() public {
        tvm.accept();
    }

    function addRelays(uint count) external {
        tvm.accept();
        for (uint i = 0; i < count; i++) {
            address q = address.makeAddrStd(1, 1);
            Relay _rel = Relay(q, 1, 2, 3);
            relays.push(_rel);
            ton_keys.push(123123);
        }
    }

    function relayKeys() public view responsible returns (uint256[]) {
        uint256[] _keys = new uint256[](relays.length);
        for (uint256 i = 0; i < _keys.length; i++) {
            _keys[i] = relays[i].ton_pubkey;
        }
        return { value: 0, bounce: false, flag: 64 } _keys;
    }

    function relayKeysSimple() public view responsible returns (uint256[]) {
        return { value: 0, bounce: false, flag: 64 } ton_keys;
    }


}

