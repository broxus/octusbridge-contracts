pragma solidity >= 0.6.0;
pragma AbiHeader expire;


interface BridgeConfigurationStructure {
    struct BridgeConfiguration {
        uint16 eventConfigurationRequiredConfirmations;
        uint16 eventConfigurationRequiredRejects;

        uint16 bridgeConfigurationUpdateRequiredConfirmations;
        uint16 bridgeConfigurationUpdateRequiredRejects;

        uint16 bridgeRelayUpdateRequiredConfirmations;
        uint16 bridgeRelayUpdateRequiredRejects;

        bool active;
    }
}
