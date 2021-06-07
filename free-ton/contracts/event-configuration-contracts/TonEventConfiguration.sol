pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';

import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';

import './../event-contracts/TonEvent.sol';

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of TON event configuration
*/
contract TonEventConfiguration is TransferUtils, IEventConfiguration, InternalOwner, CheckPubKey {
    BasicConfigurationInitData public static basicInitData;
    TonEventConfigurationInitData public static initData;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, ErrorCodes.SENDER_NOT_BRIDGE);
        _;
    }

    /*
        @param _owner Event configuration owner
    */
    constructor(address _owner) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);
    }

    /*
        @notice Build initial data for event contract
        @dev Extends event vote data with configuration params
        @param eventVoteData Event vote data structure, passed by relay
    */
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
        @notice Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @returns eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        IEvent.TonEventVoteData eventVoteData
    )
        public
        view
    returns (
        address eventContract
    ) {
        IEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: TonEvent,
            varInit: {
                initData: eventInitData
            },
            pubkey: 0,
            code: basicInitData.eventCode
        });

        return address(tvm.hash(stateInit));
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
    {
        require(
            eventVoteData.eventTimestamp >= initData.startTimestamp,
            ErrorCodes.EVENT_TIMESTAMP_LESS_THAN_START
        );

        IEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        address eventAddress = new TonEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: 0,
            varInit: {
                initData: eventInitData
            }
        }(
            relay,
            eventDataSignature
        );

        TonEvent(eventAddress).confirm{ flag: MsgFlag.REMAINING_GAS }(relay, eventDataSignature);

        emit EventConfirmation(eventAddress, relay);
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
    )
        public
        onlyBridge
    {
        address eventAddress = deriveEventAddress(eventVoteData);

        TonEvent(eventAddress).reject{value: 1 ton}(relay);

        emit EventReject(eventAddress, relay);
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
        @dev Can be called only by owner
        @param _basicInitData New basic configuration init data
        @param _initData New network specific configuration init data
    */
    function update(
        BasicConfigurationInitData _basicInitData,
        TonEventConfigurationInitData _initData
    ) public onlyOwner {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
