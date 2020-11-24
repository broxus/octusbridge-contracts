pragma solidity >= 0.5.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


import "./EventsContract.sol";


contract FreeTonBridge {
    uint public nonce;

    struct EthereumEventConfiguration {
        bytes ethereumEventABI;
        bytes ethereumAddress;
        address eventProxyAddress;
        uint confirmations;
        bool confirmed;
    }

    EthereumEventConfiguration[] ethereumEventsConfiguration;
    uint ethereumEventConfigurationRequiredConfirmations;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        ethereumEventConfigurationRequiredConfirmations = 2;
    }

    /**
        @notice Propose new Ethereum event configuration. Need more confirmation in general
        @dev One confirmation is received from the proposal author
        @param ethereumEventABI Bytes encoded Event ABI
        @param ethereumAddress Bytes encoded Ethereum address
        @param eventProxyAddress TON address of the corresponding event proxy address (callback implementation)
    **/
    function addEthereumEventConfiguration(
        bytes ethereumEventABI,
        bytes ethereumAddress,
        address eventProxyAddress
    ) public {
        tvm.accept();

        ethereumEventsConfiguration.push(EthereumEventConfiguration({
            ethereumEventABI: ethereumEventABI,
            ethereumAddress: ethereumAddress,
            eventProxyAddress: eventProxyAddress,
            confirmations: 0,
            confirmed: false
        }));

        confirmEthereumEventConfiguration(ethereumEventsConfiguration.length - 1);
    }

    /**
        @notice Confirm Ethereum event configuration.
        @param ethereumEventConfigurationID Sequential ID of the Ethereum event configuration
    **/
    function confirmEthereumEventConfiguration(uint ethereumEventConfigurationID) public {
        tvm.accept();

        require(ethereumEventConfigurationID < ethereumEventsConfiguration.length);

        ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations++;

        if (ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations >= ethereumEventConfigurationRequiredConfirmations) {
            ethereumEventsConfiguration[ethereumEventConfigurationID].confirmed = true;
        }
    }

    /**
        @notice Confirm new Ethereum event
        @dev In case there's no previous confirmation - new Event Contract will be deployed under the hood
        @param ethereumEventConfigurationID Sequential ID of the Ethereum event configuration
        @param ethereumEventData Encoded data of the Ethereum event
    **/
    function confirmEventInstance(
        uint ethereumEventConfigurationID,
        TvmCell ethereumEventData
    ) public {
        // Calculate
    }

    function getEthereumEventsConfiguration() external view returns (EthereumEventConfiguration[]) {
        tvm.accept();
        return ethereumEventsConfiguration;
    }
}
