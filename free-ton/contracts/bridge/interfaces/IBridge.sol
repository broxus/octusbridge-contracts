pragma ton-solidity >= 0.39.0;


import './event-configuration-contracts/IBasicEventConfiguration.sol';
import './event-contracts/IBasicEvent.sol';


interface IBridge {
    struct EventConfiguration {
        address addr;
        bool status;
        IBasicEventConfiguration.EventType _type;
    }

    event ConnectorDeployed(uint64 id, address connector, address eventConfiguration);

    function updateActive(bool _active) external;
    function updateConnectorDeployValue(uint64 _connectorDeployValue) external;
    function setManager(address _manager) external;

    function deriveConnectorAddress(uint64 id) external returns(address connector);
    function deployConnector(address _eventConfiguration) external;
}
