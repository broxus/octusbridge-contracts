pragma solidity >= 0.6.0;

interface IBridge {
    struct BridgeConfiguration {
        uint16 eventConfigurationRequiredConfirmations;
        uint16 eventConfigurationRequiredRejects;

        uint16 bridgeConfigurationUpdateRequiredConfirmations;
        uint16 bridgeConfigurationUpdateRequiredRejects;

        uint16 bridgeRelayUpdateRequiredConfirmations;
        uint16 bridgeRelayUpdateRequiredRejects;

        bool active;
    }

    struct BridgeRelay {
        uint key;
        uint160 ethereumAccount;
        bool action;
    }

    struct Vote {
        bytes signature;
        bytes payload;
    }
}
