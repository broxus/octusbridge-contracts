pragma ton-solidity ^0.39.0;

import './IEventConfiguration.sol';

interface IBridge {
    struct BridgeConfiguration {
        address staking;
        bool active;
    }

    struct EventConfiguration {
        address addr;
        bool status;
        IEventConfiguration.EventType _type;
    }

    event EventConfigurationCreated(uint32 id, EventConfiguration eventConfiguration);
    event EventConfigurationRemoved(uint32 id);
    event EventConfigurationUpdated(uint32 id, EventConfiguration eventConfiguration);
    event BridgeConfigurationUpdate(BridgeConfiguration bridgeConfiguration);
}
