pragma solidity >= 0.6.0;

interface IEventConfiguration {
    enum EventType {
        Ethereum,
        TON
    }

    struct BasicConfigurationInitData {
        bytes eventABI;
        uint16 eventRequiredConfirmations;
        uint16 eventRequiredRejects;
        TvmCell eventCode;
        address bridgeAddress;
        uint128 eventInitialBalance;
    }

    struct EthereumEventConfigurationInitData {
        uint160 eventAddress;
        uint16 eventBlocksToConfirm;
        address proxyAddress;
    }

    struct TonEventConfigurationInitData {
        address eventAddress;
        uint160 proxyAddress;
    }

    event EventConfirmation(address addr, uint relayKey);
    event EventReject(address addr, uint relayKey);
}
