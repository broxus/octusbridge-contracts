pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../event-contracts/TonEvent.sol';
import './../utils/TransferUtils.sol';
import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';


/*
    Contract with TON-Ethereum configuration
*/
contract TonEventConfiguration is TransferUtils, IEventConfiguration {
    BasicConfigurationInitData static basicInitData;
    TonEventConfigurationInitData static initData;

    // Error codes
    uint MSG_SENDER_NOT_BRIDGE = 202;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, MSG_SENDER_NOT_BRIDGE);
        _;
    }

    constructor() public {
        tvm.accept();
    }

    /*
        Confirm TON-Ethereum event instance. Works only when configuration is active.
        @dev This function either deploy TonEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param initData
        @param eventDataSignature Relay's signed payload for Ethereum contract
        @param relayKey Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        IEvent.TonEventInitData eventInitData,
        bytes eventDataSignature,
        uint relayKey
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        eventInitData.tonEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;

        address tonEventAddress = new TonEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relayKey,
            eventDataSignature
        );

        TonEvent(tonEventAddress).confirm{value: 1 ton}(relayKey, eventDataSignature);

        emit EventConfirmation(tonEventAddress, relayKey);
    }


    /*
        Reject Ethereum-TON event instance.
        @dev This function calls the reject method of the corresponding TonEvent contract
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev
        @param relayKey Relay key, who initialized the Bridge Ethereum event reject
    **/
    function rejectEvent(
        IEvent.TonEventInitData eventInitData,
        uint relayKey
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        eventInitData.tonEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;


        address tonEventAddress = new TonEvent{
            value: 0 ton,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relayKey,
            ''
        );

        TonEvent(tonEventAddress).reject{value: 1 ton}(relayKey);

        emit EventReject(tonEventAddress, relayKey);
    }


    /*
        Get configuration details.
        @return _basicInitData Basic configuration init data
        @return _initData Configuration init data
        @return _type Configuration type - Ethereum or TON
    */
    function getDetails() public view returns(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData,
        EventType _type
    ) {
        return (
            basicInitData,
            initData,
            EventType.TON
        );
    }

    /*
        Update configuration data
        @dev Should be called only by Bridge contract
        @param _basicInitData New basic init data
        @param _initData New init data
    */
    function updateInitData(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData
    ) public onlyBridge {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
