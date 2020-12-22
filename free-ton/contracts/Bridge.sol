pragma solidity >= 0.6.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./EthereumEventConfiguration.sol";
import "./BridgeConfigurationUpdate.sol";
import "./structures/BridgeConfigurationStructure.sol";
import "./KeysOwnable.sol";


contract FreeTonBridge is KeysOwnable, BridgeConfigurationStructure {
    uint static truffleNonce;

    BridgeConfiguration bridgeConfiguration;

    struct SequentialIndex {
        uint ethereumEventConfiguration;
        uint bridgeConfigurationUpdateVoting;
    }
    SequentialIndex sequentialIndex;

    event NewEthereumEventConfiguration(address indexed addr);
    event NewBridgeConfigurationUpdate(address indexed addr);

    modifier onlyActive() {
        require(bridgeConfiguration.active == true, 12312);
        _;
    }

    /*
        Basic Bridge contract
        @param _relayKeys List of relays public keys
        @param _bridgeConfiguration Initial Bridge configuration
    */
    constructor(
        uint[] _relayKeys,
        BridgeConfiguration _bridgeConfiguration
    ) public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        for (uint i=0; i < _relayKeys.length; i++) {
            _grantOwnership(_relayKeys[i]);
        }

        bridgeConfiguration = _bridgeConfiguration;
        bridgeConfiguration.active = true;

        sequentialIndex.ethereumEventConfiguration = 0;
        sequentialIndex.bridgeConfigurationUpdateVoting = 0;
    }

    /*
        Confirm Bridge configuration update. Only relay can do this.
        @dev One confirmation is received from the proposal author. Need more confirmation in general
        @param _bridgeConfiguration New bridge configuration
    */
    function confirmBridgeConfigurationUpdate(
        BridgeConfiguration _bridgeConfiguration
    ) public onlyActive onlyOwnerKey(msg.pubkey()) returns(address) {
        tvm.accept();

        address bridgeConfigurationUpdateAddress = new BridgeConfigurationUpdate{
            code: bridgeConfiguration.bridgeConfigurationUpdateCode,
            pubkey: tvm.pubkey(),
            varInit: {
                bridgeAddress: address(this)
            },
            value: bridgeConfiguration.bridgeConfigurationUpdateInitialBalance
        }(
            msg.pubkey(),
            bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations,
            bridgeConfiguration.bridgeConfigurationUpdateRequiredRejects,
            _bridgeConfiguration
        );

        BridgeConfigurationUpdate(bridgeConfigurationUpdateAddress).confirm{value: 1 ton}(msg.pubkey());

        emit NewBridgeConfigurationUpdate(bridgeConfigurationUpdateAddress);

        return bridgeConfigurationUpdateAddress;
    }

    /*
        Update Bridge configuration, can be called only be the correct BridgeConfigurationUpdate contract
        @param _bridgeConfiguration New bridge configuration
    */
    function updateBridgeConfiguration(BridgeConfiguration _bridgeConfiguration) public {
        // TODO: only BridgeConfigurationUpdate contract should be able to call this
        bridgeConfiguration = _bridgeConfiguration;
    }

    /**
        @notice Propose new Ethereum event configuration. Only relay can do this.
        @dev One confirmation is received from the proposal author. Need more confirmation in general
        @param ethereumEventABI Ethereum event ABI
        @param ethereumAddress Ethereum event address
        @param ethereumEventBlocksToConfirm How much blocks to wait until confirm event instance
        @param ethereumEventRequiredConfirmations How much confirmations needed to confirm event
        @param ethereumEventRequiredRejects How much rejects needed to reject event
        @param ethereumEventInitialBalance How much TON send to the Ethereum event contract
        @param eventProxyAddress TON address of the event proxy address
    **/
    function addEthereumEventConfiguration(
        bytes ethereumEventABI,
        bytes ethereumAddress,
        uint ethereumEventBlocksToConfirm,
        uint ethereumEventRequiredConfirmations,
        uint ethereumEventRequiredRejects,
        uint128 ethereumEventInitialBalance,
        address eventProxyAddress
    ) public onlyActive onlyOwnerKey(msg.pubkey()) returns(address) {
        tvm.accept();

        address ethereumEventConfigurationAddress = new EthereumEventConfiguration{
            code: bridgeConfiguration.ethereumEventConfigurationCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventABI: ethereumEventABI,
                eventAddress: ethereumAddress,
                eventRequiredConfirmations: ethereumEventRequiredConfirmations,
                eventRequiredRejects: ethereumEventRequiredRejects,
                ethereumEventBlocksToConfirm: ethereumEventBlocksToConfirm,
                eventInitialBalance: ethereumEventInitialBalance,
                proxyAddress: eventProxyAddress,
                bridgeAddress: address(this)
            },
            value: bridgeConfiguration.ethereumEventConfigurationInitialBalance
        }(
            bridgeConfiguration.ethereumEventConfigurationRequiredConfirmations,
            bridgeConfiguration.ethereumEventConfigurationRequiredRejects,
            bridgeConfiguration.ethereumEventCode,
            msg.pubkey()
        );

        sequentialIndex.ethereumEventConfiguration++;

        emit NewEthereumEventConfiguration(ethereumEventConfigurationAddress);

        return ethereumEventConfigurationAddress;
    }

    /*
        Confirm Ethereum Event configuration.
        @dev Called only by relay
        @param ethereumEventConfigurationAddress Ethereum event configuration contract address
    */
    function confirmEthereumEventConfiguration(
        address ethereumEventConfigurationAddress
    ) public onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).confirm{value: 1 ton}(msg.pubkey());
    }

    /*
        Reject Ethereum Event configuration.
        @dev Called only by relay
        @param ethereumEventConfigurationAddress Ethereum event configuration contract address
    */
    function rejectEthereumEventConfiguration(
        address ethereumEventConfigurationAddress
    ) public view onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).reject{value: 1 ton}(msg.pubkey());
    }

    /*
        Confirm Ethereum event instance.
        @dev Called only by relay
        @param eventTransaction Ethereum event transaction ID
        @param eventIndex Ethereum event index
        @param eventData Ethereum event encoded data
        @param eventBlockNumber Ethereum block number including event transaction
        @param eventBlock Ethereum block hash including event transaction
        @param ethereumEventConfigurationAddress Ethereum Event configuration contract address
    */
    function confirmEthereumEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        address ethereumEventConfigurationAddress
    ) public onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).confirmEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            msg.pubkey()
        );
    }

    /*
        Reject Ethereum event instance.
        @dev Called only by relay. Only reject already existing EthereumEvent contract, not create it.
        @param eventTransaction Ethereum event transaction ID
        @param eventIndex Ethereum event index
        @param eventData Ethereum event encoded data
        @param eventBlockNumber Ethereum block number including event transaction
        @param eventBlock Ethereum block hash including event transaction
        @param ethereumEventConfigurationAddress Ethereum Event configuration contract address
    */
    function rejectEthereumEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        address ethereumEventConfigurationAddress
    ) public onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).rejectEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            msg.pubkey()
        );
    }

    /*
        Get Bridge details.
        @returns _bridgeConfiguration Structure with Bridge configuration details
        @returns _sequentialIndex Structure with counters
    */
    function getDetails() public view returns (
        BridgeConfiguration _bridgeConfiguration,
        SequentialIndex _sequentialIndex
    ) {
        return (
            bridgeConfiguration,
            sequentialIndex
        );
    }
}
