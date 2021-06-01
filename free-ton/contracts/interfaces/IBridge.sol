pragma ton-solidity ^0.39.0;


import './IEventConfiguration.sol';
import './IEvent.sol';


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

    function createEventConfiguration(uint32 id, EventConfiguration eventConfiguration) external;
    function removeEventConfiguration(uint32 id) external;
    function updateEventConfiguration(uint32 id, EventConfiguration eventConfiguration) external;

    function getEventConfigurationDetails(uint32 id) external view returns(
        address addr,
        bool status,
        IEventConfiguration.EventType _type
    );

    function getActiveEventConfigurations() external view returns(
        uint32[] ids,
        address[] addrs,
        IEventConfiguration.EventType[] _types
    );

    function getEventConfigurations() external view returns (
        uint32[] ids,
        address[] addrs,
        bool[] statuses,
        IEventConfiguration.EventType[] _types
    );

    function confirmEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID
    ) external view;

    function confirmEthereumEventCallback(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external view;

    function rejectEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID
    ) external view;

    function rejectEthereumEventCallback(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external view;

    function confirmTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        uint32 configurationID
    ) external view;

    function confirmTonEventCallback(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        uint32 configurationID,
        address relay
    ) external view;

    function rejectTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        uint32 configurationID
    ) external view;

    function rejectTonEventCallback(
        IEvent.TonEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external view;

    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration
    ) external;
}
