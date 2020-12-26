pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../event-contracts/TonEvent.sol';
import './../utils/TransferUtils.sol';


/*
    Contract with TON-Ethereum configuration
*/
contract TonEventConfiguration is TransferUtils {
    bytes static eventABI;
    address static eventAddress;
    uint static eventRequiredConfirmations;
    uint static eventRequiredRejects;
    uint128 static eventInitialBalance;
    uint160 static proxyAddress;
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
        Confirm TON-Ethereum event instance. Works only when configuration is active.
        @dev This function either deploy TonEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @dev Should be called only through Bridge contract
        @param eventTransaction Uint encoded transaction hash
        @param eventTransaction Uint encoded message hash
        @param eventData TvmCell encoded event data
        @param eventBlockNumber Block number of transaction
        @param eventBlock Uint encoded block hash of transaction
        @param eventDataSignature Relay's signed payload for Ethereum contract
        @param relayKey Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        bytes eventDataSignature,
        uint relayKey
    ) public onlyBridge transferAfter(bridgeAddress, msg.value) {
        address tonEventAddress = new TonEvent{
            value: eventInitialBalance,
            code: eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                tonEventConfiguration: address(this),
                requiredConfirmations: eventRequiredConfirmations,
                requiredRejects: eventRequiredConfirmations
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
        address tonEventAddress = new TonEvent{
            value: 0 ton,
            code: eventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                tonEventConfiguration: address(this),
                requiredConfirmations: eventRequiredConfirmations,
                requiredRejects: eventRequiredConfirmations
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
        @returns _eventABI Ethereum event ABI
        @returns _eventAddress Ethereum event address
        @returns _eventRequiredConfirmations Amount of required confirmations
        @returns _eventRequiredRejects Amount of required rejects
        @returns _eventInitialBalance How much to send on deploy new EventContract
        @returns _proxyAddress Address of the Proxy contract in Ethereum
        @returns _bridgeAddress Address of the Bridge contract
        @return _eventCode Code of the Event contract
    */
    function getDetails() public view returns(
        bytes _eventABI,
        address _eventAddress,
        uint _eventRequiredConfirmations,
        uint _eventRequiredRejects,
        uint128 _eventInitialBalance,
        uint160 _proxyAddress,
        address _bridgeAddress,
        TvmCell _eventCode
    ) {
        return (
            eventABI,
            eventAddress,
            eventRequiredConfirmations,
            eventRequiredRejects,
            eventInitialBalance,
            proxyAddress,
            bridgeAddress,
            eventCode
        );
    }

}
