pragma ton-solidity >= 0.39.0;

interface ActionStructure {
    struct TonAction {
        uint128 value;
        address target;
        TvmCell payload;
    }

    struct EthAction {
        uint value;
        uint32 chainId;
        uint160 target;
        string signature;
        bytes callData;
    }

    struct EthActionStripped {
        uint value;
        uint160 target;
        string signature;
        bytes callData;
    }
}
