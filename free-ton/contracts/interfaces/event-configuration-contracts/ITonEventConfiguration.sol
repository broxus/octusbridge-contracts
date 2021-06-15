pragma ton-solidity ^0.39.0;

import "./IBasicEventConfiguration.sol";


interface ITonEventConfiguration is IBasicEventConfiguration {
    struct TonEventConfiguration {
        address eventEmitter;
        uint160 proxy;
        uint32 startTimestamp;
    }
}
