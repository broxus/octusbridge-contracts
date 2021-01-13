pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../event-contracts/EthereumEvent.sol';
import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';
import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';

/*
    Contract with Ethereum-TON configuration
*/
contract EthereumEventConfiguration is TransferUtils, IEventConfiguration, ErrorCodes {
    BasicConfigurationInitData static basicInitData;
    EthereumEventConfigurationInitData static initData;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, SENDER_NOT_BRIDGE);
        _;
    }

    constructor() public {
        tvm.accept();
    }

    /*
        Confirm Ethereum-TON event instance. Works only when configuration is active.
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param initData Ethereum event init data
        @param relayKey Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        IEvent.EthereumEventInitData eventInitData,
        uint relayKey
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        tvm.accept();

        eventInitData.ethereumEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;
        eventInitData.proxyAddress = initData.proxyAddress;

        address ethereumEventAddress = new EthereumEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relayKey
        );

        EthereumEvent(ethereumEventAddress).confirm{value: 1 ton}(relayKey);

        emit EventConfirmation(ethereumEventAddress, relayKey);
    }

    /*
        Reject Ethereum-TON event instance.
        @dev This function calls the reject method of the corresponding EthereumEvent contract
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param eventInitData Initial data for event contract
        @param relayKey Relay key, who initialized the Bridge Ethereum event reject
    **/
    function rejectEvent(
        IEvent.EthereumEventInitData eventInitData,
        uint relayKey
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        tvm.accept();

        eventInitData.ethereumEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;
        eventInitData.proxyAddress = initData.proxyAddress;

        address ethereumEventAddress = new EthereumEvent{
            value: 0 ton,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relayKey
        );

        EthereumEvent(ethereumEventAddress).reject{value: 1 ton}(relayKey);

        emit EventReject(ethereumEventAddress, relayKey);
    }

    /*
        Get configuration details.
        @return _basicInitData Basic configuration init data
        @return _initData Configuration init data
    */
    function getDetails() public view returns(
        BasicConfigurationInitData _basicInitData,
        EthereumEventConfigurationInitData _initData
    ) {
        return (
            basicInitData,
            initData
        );
    }

    /*
        Get event configuration type
        @return _type Configuration type - Ethereum or TON
    */
    function getType() public pure returns(EventType _type) {
        return EventType.Ethereum;
    }

    /*
        Update configuration data
        @dev Should be called only by Bridge contract
        @param _basicInitData New basic init data
        @param _initData New init data
    */
    function updateInitData(
        BasicConfigurationInitData _basicInitData,
        EthereumEventConfigurationInitData _initData
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
