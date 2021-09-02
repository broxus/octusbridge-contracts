pragma ton-solidity >= 0.39.0;


import './event-configuration-contracts/IBasicEventConfiguration.sol';
import './event-contracts/IBasicEvent.sol';


interface IBridge {
    struct BridgeConfiguration {
        address staking;
        bool active;
        TvmCell connectorCode;
        uint64 connectorDeployValue;
    }

    struct EventConfiguration {
        address addr;
        bool status;
        IBasicEventConfiguration.EventType _type;
    }

    event BridgeConfigurationUpdate(BridgeConfiguration bridgeConfiguration);
    event ConnectorDeployed(uint64 id, address connector, address eventConfiguration);

    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration
    ) external;

    function deriveConnectorAddress(uint64 id) external returns(address connector);
    function deployConnector(address _eventConfiguration) external returns(address connector);
}
