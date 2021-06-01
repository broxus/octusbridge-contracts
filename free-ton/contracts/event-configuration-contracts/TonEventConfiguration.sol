pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';

import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';

import './../event-contracts/TonEvent.sol';

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';


/*
    @title Basic example of TON event configuration
*/
contract TonEventConfiguration is TransferUtils, IEventConfiguration, InternalOwner {
    BasicConfigurationInitData static basicInitData;
    TonEventConfigurationInitData static initData;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, ErrorCodes.SENDER_NOT_BRIDGE);
        _;
    }

    /*
        @param _owner Event configuration owner
    */
    constructor(address _owner) public {
        require(tvm.pubkey() == msg.pubkey(), ErrorCodes.WRONG_TVM_KEY);
        tvm.accept();

        setOwnership(_owner);
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
        eventInitData.round = eventVoteData.round;

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
        @returns eventContract Address of the corresponding event contract
    **/
    function confirmEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        address relay
    )
        public
        onlyBridge
    returns (
        address eventContract
    ) {
        require(eventVoteData.eventTimestamp >= initData.startTimestamp, ErrorCodes.EVENT_TIMESTAMP_LESS_THAN_START);

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

        return tonEventAddress;
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
    function update(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData
    ) public onlyBridge {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
