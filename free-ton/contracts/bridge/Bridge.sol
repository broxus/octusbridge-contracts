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

        emit BridgeConfigurationUpdate(_bridgeConfiguration);

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
        emit EventConfigurationUpdated(id, eventConfiguration);
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
