pragma ton-solidity >= 0.39.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./event-configuration-contracts/EthereumEventConfiguration.sol";
import "./event-configuration-contracts/EverscaleEventConfiguration.sol";

import "./interfaces/IBridge.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/event-configuration-contracts/IBasicEventConfiguration.sol";

import "./../utils/TransferUtils.sol";
import "./../utils/ErrorCodes.sol";

import "./Connector.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Bridge contract
/// @dev Entry point for relay sync.
/// Deploys connectors for Event Configurations.
/// @author https://github.com/broxus
contract Bridge is IBridge, InternalOwner, RandomNonce, CheckPubKey, TransferUtils {
    TvmCell public connectorCode;
    uint64 public connectorDeployValue;
    bool public active;
    address public staking;

    address public manager;

    uint64 public connectorCounter = 0;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

/// @param _owner Owner address, can pause Bridge, so new Connectors can't be deployed
    /// @param _manager Manager role - can enable connectors
    /// @param _connectorCode Connector contract code
    /// @param _connectorDeployValue Value in TONs, required to be attached, to deploy Connector
    /// @param _staking Staking address
    constructor(
        address _owner,
        address _manager,
        TvmCell _connectorCode,
        uint64 _connectorDeployValue,
        address _staking
    ) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);

        manager = _manager;

        connectorCode = _connectorCode;
        connectorDeployValue = _connectorDeployValue;
        staking = _staking;

        active = true;
    }

    /// @notice Update manager address
    /// @param _manager New manager address
    function setManager(
        address _manager
    ) external override cashBack {
        require(msg.sender == manager || msg.sender == owner, ErrorCodes.SENDER_NOT_MANAGER_OR_OWNER);

        manager = _manager;
    }

    /// @notice Update Bridge active or not
    /// @dev Only owner can do that
    /// @param _active Active status
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

    function _deriveConnectorAddress(
        uint64 id
    )
        internal
        view
    returns (
        address
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

    /// @dev Derive connector address by it's id
    /// @param id Connector id
    function deriveConnectorAddress(
        uint64 id
    )
        override
        external
    returns(
        address connector
    ) {
        connector = _deriveConnectorAddress(id);
    }

    /// @dev Deploy new connector.
    /// @param _eventConfiguration Event configuration address to connect
    function deployConnector(
        address _eventConfiguration
    )
        override
        public
        reserveAtLeastTargetBalance()
    {
        require(active, ErrorCodes.BRIDGE_PAUSED);
        require(msg.value >= connectorDeployValue, ErrorCodes.TOO_LOW_DEPLOY_VALUE);
        require(_eventConfiguration.wid == 0, ErrorCodes.IS_NOT_BASE_CHAIN);

        address connector = _deriveConnectorAddress(connectorCounter);

        emit ConnectorDeployed(connectorCounter, connector, _eventConfiguration);

        new Connector{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: connectorCode,
            pubkey: 0,
            varInit: {
                id: connectorCounter,
                bridge: address(this)
            }
        }(_eventConfiguration, manager);

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
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS}(
            connectorCode,
            connectorDeployValue,
            connectorCounter,
            staking,
            active
        );
    }
}
