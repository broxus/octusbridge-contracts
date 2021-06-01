pragma ton-solidity ^0.39.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./event-configuration-contracts/EthereumEventConfiguration.sol";
import "./event-configuration-contracts/TonEventConfiguration.sol";

import "./interfaces/IEvent.sol";
import "./interfaces/IBridge.sol";
import "./interfaces/IEventConfiguration.sol";
import "./interfaces/IStaking.sol";

import "./utils/TransferUtils.sol";
import "./utils/ErrorCodes.sol";

import './../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol';
import './../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';


/*
    @title Bridge contract
    @summary Basic contract for Broxus Ethereum - FreeTON bridge.
*/
contract Bridge is IBridge, InternalOwner, RandomNonce, CheckPubKey {
    BridgeConfiguration public bridgeConfiguration;
    mapping(uint32 => EventConfiguration) eventConfigurations;

    /*
        @dev Throws an error if bridge currently inactive
    */
    modifier onlyActive() {
        require(bridgeConfiguration.active == true, ErrorCodes.BRIDGE_NOT_ACTIVE);
        _;
    }

    /*
        @dev Throws an error if event configuration currently inactive
    */
    modifier onlyActiveConfiguration(uint32 id) {
        require(eventConfigurations[id].status == true, ErrorCodes.EVENT_CONFIGURATION_NOT_ACTIVE);
        _;
    }

    /*
        @dev Throws an error if msg.sender not staking
    */
    modifier onlyStaking() {
        require(msg.sender == bridgeConfiguration.staking, ErrorCodes.SENDER_NOT_STAKING);
        _;
    }

    /*
        @param _owner Owner address
        @param _bridgeConfiguration Initial Bridge configuration
    */
    constructor(
        address _owner,
        BridgeConfiguration _bridgeConfiguration
    ) public checkPubKey {
        tvm.accept();

        bridgeConfiguration = _bridgeConfiguration;

        setOwnership(_owner);
    }

    /*
        @notice Creates new event configuration
        @dev Event configuration id should not be used at time of execution
        @param id Event configuration id
        @param eventConfiguration Event configuration details
    */
    function createEventConfiguration(
        uint32 id,
        EventConfiguration eventConfiguration
    ) override public onlyOwner {
        require(!eventConfigurations.exists(id), ErrorCodes.EVENT_CONFIGURATION_ALREADY_EXISTS);

        eventConfigurations[id] = eventConfiguration;

        emit EventConfigurationCreated(id, eventConfiguration);
    }

    /*
        @notice Removes existing event configuration
        @param id Event configuration id
    */
    function removeEventConfiguration(
        uint32 id
    ) override public onlyOwner {
        require(eventConfigurations.exists(id), ErrorCodes.EVENT_CONFIGURATION_NOT_EXISTS);

        delete eventConfigurations[id];

        emit EventConfigurationRemoved(id);
    }

    /*
        @notice Updates event configuration
        @param id Event configuration id
        @param eventConfiguration Event configuration details
    */
    function updateEventConfiguration(
        uint32 id,
        EventConfiguration eventConfiguration
    ) override public onlyOwner {
        require(eventConfigurations.exists(id), ErrorCodes.EVENT_CONFIGURATION_NOT_EXISTS);

        eventConfigurations[id] = eventConfiguration;

        emit EventConfigurationUpdated(id, eventConfiguration);
    }

    /*
        @notice Get details about specific event configuration
        @param id Event configuration id
        @returns addr Address of the event configuration contract
        @returns status Current status of the configuration (active or not)
        @returns _type Event configuration type
    */
    function getEventConfigurationDetails(
        uint32 id
    ) override public view returns (
        address addr,
        bool status,
        IEventConfiguration.EventType _type
    ) {
        addr = eventConfigurations[id].addr;
        status = eventConfigurations[id].status;
        _type = eventConfigurations[id]._type;
    }

    /*
        @notice Get list of active event configuration contracts
        @returns ids List of event configuration ids
        @returns addrs List of event configuration addresses
        @returns _types List of event configuration types
    */
    function getActiveEventConfigurations() override public view returns (
        uint32[] ids,
        address[] addrs,
        IEventConfiguration.EventType[] _types
    ) {
        for ((uint32 id, EventConfiguration eventConfiguration): eventConfigurations) {
            if (eventConfiguration.status) {
                ids.push(id);
                addrs.push(eventConfiguration.addr);
                _types.push(eventConfiguration._type);
            }
        }
    }

    /*
        @notice Get all event configurations.
        @returns ids List of event configuration ids
        @returns addrs List of event configuration addresses
        @returns statuses List of event configuration statuses
        @returns _types List of event configuration types
    */
    function getEventConfigurations() override public view returns (
        uint32[] ids,
        address[] addrs,
        bool[] statuses,
        IEventConfiguration.EventType[] _types
    ) {
        for ((uint32 id, EventConfiguration configuration): eventConfigurations) {
            ids.push(id);
            addrs.push(configuration.addr);
            statuses.push(configuration.status);
            _types.push(configuration._type);
        }
    }

    /*
        @notice Confirm Ethereum event instance.
        @dev Called by relay
        @param eventVoteData Ethereum event vote data
        @param configurationID Ethereum Event configuration ID
    */
    function confirmEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
    {
        IStaking(bridgeConfiguration.staking).confirmEthereumEvent(
            eventVoteData,
            configurationID,
            msg.sender
        );
    }

    /*
        @notice Confirm Ethereum event instance
        @dev Called only by staking contract
        @param eventVoteData Ethereum event vote data
        @param configurationID Ethereum Event configuration ID
        @param relay Relay address
    */
    function confirmEthereumEventCallback(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
        onlyStaking
    {
        EthereumEventConfiguration(eventConfigurations[configurationID].addr).confirmEvent{value: 1 ton}(
            eventVoteData,
            relay
        );
    }

    /*
        @notice Reject Ethereum event instance.
        @dev Called by relay
        @param eventVoteData Ethereum event vote data
        @param configurationID Ethereum Event configuration ID
    */
    function rejectEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
    {
        IStaking(bridgeConfiguration.staking).rejectEthereumEvent(
            eventVoteData,
            configurationID,
            msg.sender
        );
    }

    /*
        @notice Reject Ethereum event instance
        @dev Called only by staking contract
        @param eventVoteData Ethereum event vote data
        @param configurationID Ethereum Event configuration ID
        @param relay Relay address
    */
    function rejectEthereumEventCallback(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
        onlyStaking
    {
        EthereumEventConfiguration(eventConfigurations[configurationID].addr).rejectEvent{value: 1 ton}(
            eventVoteData,
            relay
        );
    }

    /*
        @notice Confirm TON event instance.
        @dev Called only by relay
        @param eventVoteData Ton event vote data
        @param eventDataSignature Relay's signature of the corresponding TonEvent structure
        @param configurationID Ton Event configuration ID
    */
    function confirmTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        uint32 configurationID
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
    {
        IStaking(bridgeConfiguration.staking).confirmTonEvent(
            eventVoteData,
            eventDataSignature,
            configurationID,
            msg.sender
        );
    }

    /*
        @notice Confirm TON event instance
        @dev Called only by staking contract
        @param eventVoteData Ton event vote data
        @param eventDataSignature Relay's signature of the corresponding TonEvent structure
        @param configurationID Ton Event configuration ID
        @param relay Relay address
    */
    function confirmTonEventCallback(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        uint32 configurationID,
        address relay
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
        onlyStaking
    {
        TonEventConfiguration(eventConfigurations[configurationID].addr).confirmEvent{value: 1 ton}(
            eventVoteData,
            eventDataSignature,
            relay
        );
    }

    /*
        @notice Reject TON event instance.
        @dev Called only by relay. Only reject already existing TonEvent contract, not deploy it.
        @param eventVoteData Ton event vote data
        @param configurationID Ton Event configuration ID
        @param roundID Event round ID
    */
    function rejectTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        uint32 configurationID
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
    {
        IStaking(bridgeConfiguration.staking).rejectTonEvent(
            eventVoteData,
            configurationID,
            msg.sender
        );
    }

    /*
        @notice Reject TON event instance
        @dev Called only by staking contract
        @param eventVoteData Ton event vote data
        @param configurationID Ton Event configuration ID
        @param relay Relay address
    */
    function rejectTonEventCallback(
        IEvent.TonEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    )
        override
        public
        view
        onlyActive
        onlyActiveConfiguration(configurationID)
        onlyStaking
    {
        TonEventConfiguration(eventConfigurations[configurationID].addr).rejectEvent{value: 1 ton}(
            eventVoteData,
            relay
        );
    }

    /*
        @notice Vote for Bridge configuration update
        @dev Can be called only by relay
        @param _bridgeConfiguration New bridge configuration
    */
    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration
    )
        override
        public
        onlyOwner
    {
        bridgeConfiguration = _bridgeConfiguration;

        emit BridgeConfigurationUpdate(_bridgeConfiguration);
    }
}
