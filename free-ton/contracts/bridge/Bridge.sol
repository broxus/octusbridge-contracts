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
    BridgeConfiguration public bridgeConfiguration;
    uint64 public connectorCounter = 0;

    /// @param _owner Owner address
    /// @param _bridgeConfiguration Initial Bridge configuration
    constructor(
        address _owner,
        BridgeConfiguration _bridgeConfiguration
    ) public checkPubKey {
        tvm.accept();

        bridgeConfiguration = _bridgeConfiguration;

        emit BridgeConfigurationUpdate(_bridgeConfiguration);

        setOwnership(_owner);
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
            code: bridgeConfiguration.connectorCode
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
        require(msg.value >= bridgeConfiguration.connectorDeployValue, ErrorCodes.TOO_LOW_DEPLOY_VALUE);

        emit ConnectorDeployed(connectorCounter, connector, _eventConfiguration);

        connector = new Connector{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: bridgeConfiguration.connectorCode,
            pubkey: 0,
            varInit: {
                id: connectorCounter,
                bridge: address(this)
            }
        }(_eventConfiguration, owner);

        connectorCounter++;
    }

    /// @dev Update bridge configuration
    /// @param _bridgeConfiguration New bridge configuration
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
