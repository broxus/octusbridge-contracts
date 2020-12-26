pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../event-contracts/EthereumEvent.sol';
import './../utils/TransferUtils.sol';

/*
    Contract with Ethereum-TON configuration
*/
contract EthereumEventConfiguration is TransferUtils {
    bytes static eventABI;
    uint160 static eventAddress;
    uint static eventRequiredConfirmations;
    uint static eventRequiredRejects;
    uint static eventBlocksToConfirm;
    uint128 static eventInitialBalance;
    address static proxyAddress;
    address static bridgeAddress;
    TvmCell static eventCode;

    // Error codes
    uint MSG_SENDER_NOT_BRIDGE = 202;

    modifier onlyBridge() {
        require(msg.sender == bridgeAddress, MSG_SENDER_NOT_BRIDGE);
        _;
    }

    event EventConfirmation(address addr, uint relayKey);
    event EventReject(address addr, uint relayKey);

    constructor() public {
        tvm.accept();
    }

    /*
        Confirm Ethereum-TON event instance. Works only when configuration is active.
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param eventTransaction Bytes encoded transaction hash
        @param eventIndex Event Index from the transaction
        @param eventData TvmCell encoded event data
        @param relayKey Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        uint relayKey
    ) public onlyBridge transferAfter(bridgeAddress, msg.value) {
        tvm.accept();

        address ethereumEventAddress = new EthereumEvent{
            value: eventInitialBalance,
            code: eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                proxyAddress: proxyAddress,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                ethereumEventConfirguration: address(this),
                requiredConfirmations: eventRequiredConfirmations,
                requiredRejects: eventRequiredConfirmations
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
        @param eventTransaction Uint encoded transaction hash
        @param eventIndex Event Index from the transaction
        @param eventData TvmCell encoded event data
        @param eventBlockNumber Ethereum block number with event transaction
        @param eventBlock Uint encoded block hash
        @param relayKey Relay key, who initialized the Bridge Ethereum event reject
    **/
    function rejectEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        uint relayKey
    ) public onlyBridge transferAfter(bridgeAddress, msg.value) {
        tvm.accept();

        address ethereumEventAddress = new EthereumEvent{
            value: 0 ton,
            code: eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                proxyAddress: proxyAddress,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                ethereumEventConfirguration: address(this),
                requiredConfirmations: eventRequiredConfirmations,
                requiredRejects: eventRequiredConfirmations
            }
        }(
            relayKey
        );

        EthereumEvent(ethereumEventAddress).reject{value: 1 ton}(relayKey);

        emit EventReject(ethereumEventAddress, relayKey);
    }

    /*
        Get configuration details.
        @returns _eventABI Ethereum event ABI
        @returns _eventAddress Ethereum event address
        @returns _proxyAddress proxy contract address
        @returns _eventBlocksToConfirm Ethereum blocks to wait before submit confirmation
        @returns _eventRequiredConfirmations Amount of required confirmations
        @returns _eventRequiredRejects Amount of required rejects
        @returns _eventInitialBalance How much to send on deploy new EventContract
        @returns _bridgeAddress Address of the Bridge contract
        @return _eventCode Code of the Event contract
    */
    function getDetails() public view returns(
        bytes _eventABI,
        uint160 _eventAddress,
        address _proxyAddress,
        uint _eventBlocksToConfirm,
        uint _eventRequiredConfirmations,
        uint _eventRequiredRejects,
        uint128 _eventInitialBalance,
        address _bridgeAddress,
        TvmCell _eventCode
    ) {
        return (
            eventABI,
            eventAddress,
            proxyAddress,
            eventBlocksToConfirm,
            eventRequiredConfirmations,
            eventRequiredRejects,
            eventInitialBalance,
            bridgeAddress,
            eventCode
        );
    }
}
