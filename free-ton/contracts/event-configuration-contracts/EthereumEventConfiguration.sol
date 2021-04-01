pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../event-contracts/EthereumEvent.sol';
import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';
import './../interfaces/IEvent.sol';
import './../interfaces/IEventConfiguration.sol';

/*
    @title Basic example of Ethereum event configuration
*/
contract EthereumEventConfiguration is TransferUtils, IEventConfiguration, ErrorCodes {
    BasicConfigurationInitData static basicInitData;
    EthereumEventConfigurationInitData static initData;

    modifier onlyBridge() {
        require(msg.sender == basicInitData.bridgeAddress, SENDER_NOT_BRIDGE);
        _;
    }

    constructor() public {
        require(tvm.pubkey() == msg.pubkey(), WRONG_TVM_KEY);
        tvm.accept();
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

        eventInitData.ethereumEventConfiguration = address(this);
        eventInitData.requiredConfirmations = basicInitData.eventRequiredConfirmations;
        eventInitData.requiredRejects = basicInitData.eventRequiredConfirmations;
        eventInitData.proxyAddress = initData.proxyAddress;

        eventInitData.configurationMeta = basicInitData.meta;
    }

    /*
        @notice Confirm Ethereum-TON event
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        @dev Can be called only by Bridge contract
        @param eventVoteData Ethereum event init data
        @param relay Relay, who initialized the confirmation
    **/
    function confirmEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        address relay
    )
        public
        onlyBridge
        transferAfter(basicInitData.bridgeAddress, msg.value)
    {
        require(eventVoteData.eventBlockNumber >= initData.startBlockNumber, EVENT_BLOCK_NUMBER_LESS_THAN_START);

        IEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        address ethereumEventAddress = new EthereumEvent{
            value: basicInitData.eventInitialBalance,
            code: basicInitData.eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                initData: eventInitData
            }
        }(
            relay
        );

        EthereumEvent(ethereumEventAddress).confirm{value: 1 ton}(relay);

        emit EventConfirmation(ethereumEventAddress, relay);
    }

    /*
        @notice Reject Ethereum-TON event.
        @dev This function calls the reject method of the corresponding EthereumEvent contract
        @dev EthereumEvent contract is not deployed
        @dev Can be called only by Bridge contract
        @param eventVoteData Ethereum event init data
        @param relay Relay, who initialized the rejection
    **/
    function rejectEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        address relay
    )
        public
        onlyBridge
        transferAfter(basicInitData.bridgeAddress, msg.value)
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
        @dev Can be called only by Bridge contract
        @param _basicInitData New basic configuration init data
        @param _initData New network specific configuration init data
    */
    function updateInitData(
        BasicConfigurationInitData _basicInitData,
        EthereumEventConfigurationInitData _initData
    ) public onlyBridge transferAfter(basicInitData.bridgeAddress, msg.value) {
        basicInitData = _basicInitData;
        initData = _initData;
    }
}
