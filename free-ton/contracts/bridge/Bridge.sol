pragma ton-solidity >= 0.39.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./event-configuration-contracts/EthereumEventConfiguration.sol";
import "./event-configuration-contracts/TonEventConfiguration.sol";

import "./interfaces/IBridge.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/event-configuration-contracts/IBasicEventConfiguration.sol";

import "./../utils/TransferUtils.sol";
import "./../utils/ErrorCodes.sol";

import "./Connector.sol";

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Bridge contract
/// @dev Entry point for relay sync.
/// Deploys connectors for Event Configurations.
/// @author https://github.com/pavlovdog
contract Bridge is IBridge, InternalOwner, RandomNonce, CheckPubKey, TransferUtils {
    TvmCell public connectorCode;
    uint64 public connectorDeployValue;
    bool public active;
    address public staking;

    uint64 public connectorCounter = 0;

    /// @param _owner Owner address
    /// @param _connectorCode Connector contract code
    /// @param _connectorDeployValue Value in TONs, required to be attached, to deploy Connector
    /// @param _staking Staking address
    constructor(
        address _owner,
        TvmCell _connectorCode,
        uint64 _connectorDeployValue,
        address _staking
    ) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);

        connectorCode = _connectorCode;
        connectorDeployValue = _connectorDeployValue;
        staking = _staking;

        active = true;
    }

    /**
        @notice Update Bridge active or not
        @param _active Active status
    */
    function updateActive(
        bool _active
    ) external override cashBack onlyOwner {
        active = _active;
    }

    /**
        @notice Update connector deploy value
        @param _connectorDeployValue Value in TONs, required to be attached, to deploy Connector
    */
    function updateConnectorDeployValue(
        uint64 _connectorDeployValue
    ) external override cashBack onlyOwner {
        connectorDeployValue = _connectorDeployValue;
    }

    /// @dev Derive connector address by it's id
    /// @param id Connector id
    function deriveConnectorAddress(
        uint64 id
    )
        override
        public
        reserveBalance
    returns(
        address connector
    ) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: Connector,
            varInit: {
                id: id,
                bridge: address(this)
            },
            pubkey: 0,
            code: connectorCode
        });

        return address(tvm.hash(stateInit));
    }

    /// @dev Deploy new connector.
    /// @param _eventConfiguration Event configuration address to connect
    /// @return connector Expected connector address
    function deployConnector(
        address _eventConfiguration
    )
        override
        public
        reserveBalance
    returns(
        address connector
    ) {
        require(active, ErrorCodes.BRIDGE_PAUSED);
        require(msg.value >= connectorDeployValue, ErrorCodes.TOO_LOW_DEPLOY_VALUE);
        require(_eventConfiguration.wid == 0, ErrorCodes.IS_NOT_BASE_CHAIN);

        emit ConnectorDeployed(connectorCounter, connector, _eventConfiguration);

        connector = new Connector{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: connectorCode,
            pubkey: 0,
            varInit: {
                id: connectorCounter,
                bridge: address(this)
            }
        }(_eventConfiguration, owner);

        connectorCounter++;
    }

    /**
        @notice Get Bridge details
        @return _connectorCode Connector contract code
        @return _connectorDeployValue Value in TONs, required to be attached, to deploy Connector
        @return _connectorCounter Counter of deployed connectors
        @return _staking Staking address
        @return _active Bridge status
    */
    function getDetails() external view responsible returns(
        TvmCell _connectorCode,
        uint64 _connectorDeployValue,
        uint64 _connectorCounter,
        address _staking,
        bool _active
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            connectorCode,
            connectorDeployValue,
            connectorCounter,
            staking,
            active
        );
    }
}
