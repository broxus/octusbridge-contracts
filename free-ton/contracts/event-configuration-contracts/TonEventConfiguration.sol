pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../event-contracts/TonEvent.sol';
import './../utils/TransferUtils.sol';
import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';
import "../utils/ErrorCodes.sol";


/*
    Contract with TON-Ethereum configuration
*/
contract TonEventConfiguration is TransferUtils, IEventConfiguration, ErrorCodes {
    BasicConfigurationInitData static basicInitData;
    TonEventConfigurationInitData static initData;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, SENDER_NOT_BRIDGE);
        _;
    }

    constructor() public {
        require(tvm.pubkey() == msg.pubkey(), WRONG_TVM_KEY);
        tvm.accept();
    }

    function buildEventInitData(
        IEvent.TonEventVoteData eventVoteData
    ) internal view returns(
        IEvent.TonEventInitData eventInitData
    ) {
        eventInitData.eventTransaction = eventVoteData.eventTransaction;
        eventInitData.eventTimestamp = eventVoteData.eventTimestamp;
        eventInitData.eventTransactionLt = eventVoteData.eventTransactionLt;
        eventInitData.eventIndex = eventVoteData.eventIndex;
        eventInitData.eventData = eventVoteData.eventData;

        eventInitData.tonEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;

        eventInitData.configurationMeta = basicInitData.meta;
    }

    /*
        Confirm TON-Ethereum event instance. Works only when configuration is active.
        @dev This function either deploy TonEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param initData
        @param eventDataSignature Relay's signed payload for Ethereum contract
        @param relay Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        address relay
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        IEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        address tonEventAddress = new TonEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relay,
            eventDataSignature
        );

        TonEvent(tonEventAddress).confirm{value: 1 ton}(relay, eventDataSignature);

        emit EventConfirmation(tonEventAddress, relay);
    }


    /*
        Reject Ethereum-TON event instance.
        @dev This function calls the reject method of the corresponding TonEvent contract
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev
        @param relay Relay key, who initialized the Bridge Ethereum event reject
    **/
    function rejectEvent(
        IEvent.TonEventVoteData eventVoteData,
        address relay
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        IEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        address tonEventAddress = new TonEvent{
            value: 0 ton,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relay,
            ''
        );

        TonEvent(tonEventAddress).reject{value: 1 ton}(relay);

        emit EventReject(tonEventAddress, relay);
    }


    /*
        Get configuration details.
        @return _basicInitData Basic configuration init data
        @return _initData Configuration init data
    */
    function getDetails() public view returns(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData
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
        return EventType.TON;
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
