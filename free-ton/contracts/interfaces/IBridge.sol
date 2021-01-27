pragma solidity >= 0.6.0;

interface IBridge {
    struct BridgeConfiguration {
        uint16 nonce;

        uint16 bridgeUpdateRequiredConfirmations;
        uint16 bridgeUpdateRequiredRejects;

        bool active;
    }

    struct BridgeRelay {
        uint16 nonce;

        int8 wid;
        uint addr;
        uint160 ethereumAccount;
        bool action;
    }

    struct Vote {
        bytes signature;
    }
}
