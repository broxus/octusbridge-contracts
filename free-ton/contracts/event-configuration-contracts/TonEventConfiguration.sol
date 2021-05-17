pragma ton-solidity ^0.43.0;
pragma AbiHeader expire;


import './../event-contracts/TonEvent.sol';
import './../utils/TransferUtils.sol';
import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';
import "../utils/ErrorCodes.sol";


/*
    @title Basic example of TON event configuration
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
        @notice Confirm TON-Ethereum event
        @dev This function either deploy TonEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        @dev Can be called only through Bridge contract
        @param eventVoteData TON event init data
        @param eventDataSignature Relay's signed payload
        @param relay Relay, who initialized the confirmation
    **/
    function confirmEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        address relay
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        require(eventVoteData.eventTimestamp >= initData.startTimestamp, EVENT_TIMESTAMP_LESS_THAN_START);

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
        @notice Reject TON-Ethereum event.
        @dev This function calls the reject method of the corresponding TonEvent contract
        @dev TonEvent contract is not deployed
        @dev Can be called only by Bridge contract
        @param eventVoteData TON event init data
        @param relay Relay, who initialized the rejection
    */
    function rejectEvent(
        IEvent.TonEventVoteData eventVoteData,
        address relay
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        IEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        address tonEventAddress = new TonEvent{
            value: 0 ton,
            flag: 2,
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
        @notice Get configuration details.
        @return _basicInitData Basic configuration init data
        @return _initData Network specific configuration init data
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
        @notice Get event configuration type
        @return _type Configuration type - Ethereum or TON
    */
    function getType() public pure returns(EventType _type) {
        return EventType.TON;
    }


    /*
        @notice Update configuration data
        @dev Can be called only by Bridge contract
        @param _basicInitData New basic configuration init data
        @param _initData New network specific configuration init data
    */
    function updateInitData(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData
    ) public onlyBridge {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
