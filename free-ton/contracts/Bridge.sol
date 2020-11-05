pragma solidity >= 0.5.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


import "./EventsContract.sol";


contract FreeTonBridge {
    uint public nonce;

    struct EthereumEventConfiguration {
        bytes[] ethereumEventABI;
        bytes[] ethereumAddress;
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

    function addEthereumEventConfiguration(
        bytes[] ethereumEventABI,
        bytes[] ethereumAddress,
        address eventProxyAddress
    ) public {
        ethereumEventsConfiguration.push(EthereumEventConfiguration({
            ethereumEventABI: ethereumEventABI,
            ethereumAddress: ethereumAddress,
            eventProxyAddress: eventProxyAddress,
            confirmations: 0,
            confirmed: false
        }));
    }

    function confirmEthereumEventConfiguration(uint ethereumEventConfigurationID) public {
        require(ethereumEventConfigurationID < ethereumEventsConfiguration.length);

        ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations++;

        if (ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations >= ethereumEventConfigurationRequiredConfirmations) {
            ethereumEventsConfiguration[ethereumEventConfigurationID].confirmed = true;
        }
    }

    function emitEventInstance() public {

    }

    function confirmEventInstance() public {

    }

    function getEthereumEventsConfiguration() external view returns (EthereumEventConfiguration[]) {
        return ethereumEventsConfiguration;
    }
}
