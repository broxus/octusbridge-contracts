pragma solidity >= 0.6.0;
pragma AbiHeader expire;


interface BridgeConfigurationStructure {
    struct BridgeConfiguration {
        TvmCell ethereumEventConfigurationCode;
        uint ethereumEventConfigurationRequiredConfirmations;
        uint ethereumEventConfigurationRequiredRejects;
        uint128 ethereumEventConfigurationInitialBalance;

        TvmCell ethereumEventCode;

        TvmCell bridgeConfigurationUpdateCode;
        uint bridgeConfigurationUpdateRequiredConfirmations;
        uint bridgeConfigurationUpdateRequiredRejects;
        uint128 bridgeConfigurationUpdateInitialBalance;

        bool active;
    }
}
