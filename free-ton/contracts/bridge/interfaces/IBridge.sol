pragma ton-solidity ^0.39.0;


import './event-configuration-contracts/IBasicEventConfiguration.sol';
import './event-contracts/IBasicEvent.sol';


interface IBridge {
    struct BridgeConfiguration {
        address staking;
        bool active;
    }

    struct EventConfiguration {
        address addr;
        bool status;
        IBasicEventConfiguration.EventType _type;
    }

    event EventConfigurationCreated(uint32 id, EventConfiguration eventConfiguration);
    event EventConfigurationRemoved(uint32 id);
    event EventConfigurationUpdated(uint32 id, EventConfiguration eventConfiguration);

    event BridgeConfigurationUpdate(BridgeConfiguration bridgeConfiguration);

    function createEventConfiguration(uint32 id, EventConfiguration eventConfiguration) external;
    function removeEventConfiguration(uint32 id) external;
    function updateEventConfiguration(uint32 id, EventConfiguration eventConfiguration) external;

    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration
    ) external;
}
