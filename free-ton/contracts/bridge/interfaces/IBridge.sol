pragma ton-solidity ^0.39.0;


import './event-configuration-contracts/IBasicEventConfiguration.sol';
import './event-contracts/IBasicEvent.sol';


interface IBridge {
    struct BridgeConfiguration {
        address staking;
        bool active;
        TvmCell connectorCode;
        uint128 connectorDeployValue;
    }

    struct EventConfiguration {
        address addr;
        bool status;
        IBasicEventConfiguration.EventType _type;
    }

    event EventConfigurationEnabled(uint32 id, EventConfiguration eventConfiguration);
    event EventConfigurationDisabled(uint32 id);
    event EventConfigurationUpdated(uint32 id, EventConfiguration eventConfiguration);
    event BridgeConfigurationUpdate(BridgeConfiguration bridgeConfiguration);
    event ConnectorDeployed(uint128 id, address connector, address eventConfiguration);

    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration
    ) external;

    function deriveConnectorAddress(uint128 id) external returns(address connector);
    function deployConnector(address _eventConfiguration) external returns(address connector);
}
