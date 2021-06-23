pragma ton-solidity ^0.39.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./event-configuration-contracts/EthereumEventConfiguration.sol";
import "./event-configuration-contracts/TonEventConfiguration.sol";

import "./interfaces/IBridge.sol";
import "./interfaces/event-configuration-contracts/IBasicEventConfiguration.sol";

import "./../utils/TransferUtils.sol";
import "./../utils/ErrorCodes.sol";

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Bridge contract
    @summary Basic contract for Broxus Ethereum - FreeTON bridge.
*/
contract Bridge is IBridge, InternalOwner, RandomNonce, CheckPubKey, TransferUtils {
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
    )
        override
        public
        cashBack
        onlyOwner
    {
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
    )
        override
        public
        cashBack
        onlyOwner
    {
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
    )
        override
        public
        cashBack
        onlyOwner
    {
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
        IBasicEventConfiguration.EventType _type
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
        IBasicEventConfiguration.EventType[] _types
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
        IBasicEventConfiguration.EventType[] _types
    ) {
        for ((uint32 id, EventConfiguration configuration): eventConfigurations) {
            ids.push(id);
            addrs.push(configuration.addr);
            statuses.push(configuration.status);
            _types.push(configuration._type);
        }
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
        cashBack
        onlyOwner
    {
        bridgeConfiguration = _bridgeConfiguration;

        emit BridgeConfigurationUpdate(_bridgeConfiguration);
    }
}
