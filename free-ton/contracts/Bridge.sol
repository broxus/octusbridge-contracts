pragma solidity >= 0.6.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./EthereumEventConfiguration.sol";
import "./KeysOwnable.sol";


contract FreeTonBridge is KeysOwnable {
    uint static nonce;

    TvmCell ethereumEventConfigurationCode;
    TvmCell ethereumEventCode;

    struct BridgeConfiguration {
        uint ethereumEventConfigurationRequiredConfirmations;
        uint ethereumEventConfigurationRequiredRejects;
        uint ethereumEventConfigurationSequentialIndex;
    }
    BridgeConfiguration bridgeConfiguration;

    event AddEthereumEventConfigurationEvent(address indexed ethereumEventConfigurationAddress);

    constructor(
        TvmCell _ethereumEventConfigurationCode,
        TvmCell _ethereumEventCode,
        uint[] _relayKeys,
        uint _ethereumEventConfigurationRequiredConfirmations,
        uint _ethereumEventConfigurationRequiredRejects
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

        bridgeConfiguration.ethereumEventConfigurationSequentialIndex = 0;
    }

    /**
        @notice Propose new Ethereum event configuration. Only relay can do this.
        @dev One confirmation is received from the proposal author. Need more confirmation in general
        @param eventProxyAddress TON address of the event proxy address
    **/
    function addEthereumEventConfiguration(
        bytes ethereumEventABI,
        bytes ethereumAddress,
        address eventProxyAddress
    ) public returns(address) {
        tvm.accept();

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
            ethereumEventCode,
            msg.pubkey()
        );

        bridgeConfiguration.ethereumEventConfigurationSequentialIndex++;

        emit AddEthereumEventConfigurationEvent(ethereumEventConfigurationAddress);

        return ethereumEventConfigurationAddress;
    }

    function confirmEthereumEventConfiguration(
        address ethereumEventConfigurationAddress
    ) public pure {
        tvm.accept();

        EthereumEventConfiguration(ethereumEventConfigurationAddress).confirm(msg.pubkey());
    }

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
