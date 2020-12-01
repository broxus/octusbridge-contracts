pragma solidity >= 0.6.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./EthereumEventConfiguration.sol";
import "./KeysOwnable.sol";


contract FreeTonBridge is KeysOwnable {
    // Same nonce with the same keys means same address
    uint static truffleNonce;

    TvmCell ethereumEventConfigurationCode;
    TvmCell ethereumEventCode;

    struct BridgeConfiguration {
        uint ethereumEventConfigurationRequiredConfirmations;
        uint ethereumEventConfigurationRequiredRejects;
        uint ethereumEventRequiredConfirmations;
        uint ethereumEventConfigurationSequentialIndex;
    }
    BridgeConfiguration bridgeConfiguration;

    event NewEthereumEventConfiguration(address indexed addr);
    event Key(uint key);

    /*
        Basic Bridge contract
        @param _ethereumEventConfigurationCode Ethereum Event configuration contract code
        @param _ethereumEventCode Ethereum Event contract code
        @param _relayKeys List of relays public keys
        @param _ethereumEventConfigurationRequiredConfirmations Required confirmations to confirm Ethereum-TON config
        @param _ethereumEventConfigurationRequiredRejects Required rejects to reject Ethereum-TON config
    */
    constructor(
        TvmCell _ethereumEventConfigurationCode,
        TvmCell _ethereumEventCode,
        uint[] _relayKeys,
        uint _ethereumEventConfigurationRequiredConfirmations,
        uint _ethereumEventConfigurationRequiredRejects,
        uint _ethereumEventRequiredConfirmations
    ) public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        for (uint i=0; i < _relayKeys.length; i++) {
            _grantOwnership(_relayKeys[i]);
        }

        ethereumEventConfigurationCode = _ethereumEventConfigurationCode;
        ethereumEventCode = _ethereumEventCode;

        bridgeConfiguration.ethereumEventConfigurationRequiredConfirmations = _ethereumEventConfigurationRequiredConfirmations;
        bridgeConfiguration.ethereumEventConfigurationRequiredRejects = _ethereumEventConfigurationRequiredRejects;
        bridgeConfiguration.ethereumEventRequiredConfirmations = _ethereumEventRequiredConfirmations;

        bridgeConfiguration.ethereumEventConfigurationSequentialIndex = 0;
    }

    /**
        @notice Propose new Ethereum event configuration. Only relay can do this.
        @dev One confirmation is received from the proposal author. Need more confirmation in general
        @param ethereumEventABI Ethereum event ABI
        @param ethereumAddress Ethereum event address
        @param eventProxyAddress TON address of the event proxy address
    **/
    function addEthereumEventConfiguration(
        bytes ethereumEventABI,
        bytes ethereumAddress,
        address eventProxyAddress
    ) public returns(address) {
        tvm.accept();

        emit Key(msg.pubkey());

        address ethereumEventConfigurationAddress = new EthereumEventConfiguration{
            code: ethereumEventConfigurationCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventABI: ethereumEventABI,
                eventAddress: ethereumAddress,
                proxyAddress: eventProxyAddress,
                bridgeAddress: address(this)
            },
            value: 10 ton
        }(
            bridgeConfiguration.ethereumEventConfigurationRequiredConfirmations,
            bridgeConfiguration.ethereumEventConfigurationRequiredRejects,
            bridgeConfiguration.ethereumEventRequiredConfirmations,
            ethereumEventCode,
            msg.pubkey()
        );

        bridgeConfiguration.ethereumEventConfigurationSequentialIndex++;

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
    ) public pure {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).confirm(msg.pubkey());
    }

    /*
        Reject Ethereum Event configuration.
        @dev Called only by relay
        @param ethereumEventConfigurationAddress Ethereum event configuration contract address
    */
    function rejectEthereumEventConfiguration(
        address ethereumEventConfigurationAddress
    ) public pure {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).reject(msg.pubkey());
    }

    /*
        Confirm Ethereum event instance.
        @dev Called only by relay
        @param eventTransaction Ethereum event transaction ID
        @param eventIndex Ethereum event index
        @param eventData Ethereum event encoded data
        @param ethereumEventConfigurationAddress Ethereum Event configuration contract address
    */
    function confirmEthereumEvent(
        bytes eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        address ethereumEventConfigurationAddress
    ) public pure {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).confirmEvent(
            eventTransaction,
            eventIndex,
            eventData,
            msg.pubkey()
        );
    }
}
