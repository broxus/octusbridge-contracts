pragma solidity >= 0.6.0;

interface IEventConfiguration {
    enum EventType { Ethereum, TON }

    struct BasicConfigurationInitData {
        bytes eventABI;
        uint16 eventRequiredConfirmations;
        uint16 eventRequiredRejects;
        TvmCell eventCode;
        address bridgeAddress;
        uint128 eventInitialBalance;
        TvmCell meta;
    }

    struct EthereumEventConfigurationInitData {
        uint160 eventAddress;
        uint16 eventBlocksToConfirm;
        address proxyAddress;
        uint32 startBlockNumber;
    }

    struct TonEventConfigurationInitData {
        address eventAddress;
        uint160 proxyAddress;
        uint32 startTimestamp;
    }

    event EventConfirmation(address addr, address relay);
    event EventReject(address addr, address relay);
}
