pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';

import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';

import './../event-contracts/EthereumEvent.sol';

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';


/*
    @title Basic example of Ethereum event configuration
*/
contract EthereumEventConfiguration is TransferUtils, IEventConfiguration, InternalOwner, CheckPubKey {
    BasicConfigurationInitData public static basicInitData;
    EthereumEventConfigurationInitData public static initData;

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

    function buildEventInitData(
        IEvent.EthereumEventVoteData eventVoteData
    ) internal view returns(
        IEvent.EthereumEventInitData eventInitData
    ) {
        eventInitData.eventTransaction = eventVoteData.eventTransaction;
        eventInitData.eventIndex = eventVoteData.eventIndex;
        eventInitData.eventData = eventVoteData.eventData;
        eventInitData.eventBlockNumber = eventVoteData.eventBlockNumber;
        eventInitData.eventBlock = eventVoteData.eventBlock;
        eventInitData.round = eventVoteData.round;

        eventInitData.ethereumEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;
        eventInitData.proxyAddress = initData.proxyAddress;

        eventInitData.configurationMeta = basicInitData.meta;
    }

    /*
        @notice Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @returns eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        IEvent.EthereumEventVoteData eventVoteData
    ) public view returns(address eventContract) {
        IEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: EthereumEvent,
            varInit: {
                initData: eventInitData
            },
            pubkey: 0,
            code: basicInitData.eventCode
        });

        return address(tvm.hash(stateInit));
    }

    /*
        @notice Confirm Ethereum-TON event
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        @dev Can be called only by Bridge contract
        @param eventVoteData Ethereum event vote data
        @param relay Relay, who initialized the confirmation
        @returns eventContract Address of the corresponding event contract
    **/
    function confirmEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        address relay
    )
        public
        onlyBridge
    returns (
        address eventContract
    ) {
        require(
            eventVoteData.eventBlockNumber >= initData.startBlockNumber,
            ErrorCodes.EVENT_BLOCK_NUMBER_LESS_THAN_START
        );

        IEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        address ethereumEventAddress = new EthereumEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: 0,
            varInit: {
                initData: eventInitData
            }
        }(
            relay
        );

        EthereumEvent(ethereumEventAddress).confirm{value: 1 ton}(relay);

        emit EventConfirmation(ethereumEventAddress, relay);

        return eventContract;
    }

    /*
        @notice Reject Ethereum-TON event.
        @dev This function calls the reject method of the corresponding EthereumEvent contract
        @dev EthereumEvent contract is not deployed
        @dev Can be called only by Bridge contract
        @param eventVoteData Ethereum event vote data
        @param relay Relay, who initialized the rejection
    **/
    function rejectEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        address relay
    )
        public
        onlyBridge
    {
        IEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        address ethereumEventAddress = new EthereumEvent{
            value: 0 ton,
            flag: 2,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relay
        );

        EthereumEvent(ethereumEventAddress).reject{value: 1 ton}(relay);

        emit EventReject(ethereumEventAddress, relay);
    }

    /*
        @notice Get configuration details.
        @return _basicInitData Basic configuration init data
        @return _initData Network specific configuration init data
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
        @notice Get event configuration type
        @return _type Configuration type - Ethereum or TON
    */
    function getType() public pure returns(EventType _type) {
        return EventType.Ethereum;
    }

    /*
        @notice Update configuration data
        @dev Can be called only by owner
        @param _basicInitData New basic configuration init data
        @param _initData New network specific configuration init data
    */
    function update(
        BasicConfigurationInitData _basicInitData,
        EthereumEventConfigurationInitData _initData
    ) public onlyOwner {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
