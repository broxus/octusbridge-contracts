pragma ton-solidity ^0.39.0;

import "./IBasicEventConfiguration.sol";


interface IEthereumEventConfiguration is IBasicEventConfiguration {
    struct EthereumEventConfiguration {
        uint160 eventEmitter;
        uint16 eventBlocksToConfirm;
        address proxy;
        uint32 startBlockNumber;
    }
}
