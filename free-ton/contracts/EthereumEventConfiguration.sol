pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './EthereumEvent.sol';
import "./TransferChangeBack.sol";


contract EthereumEventConfiguration is TransferChangeBack {
    bytes static eventABI;
    bytes static eventAddress;
    uint static eventRequiredConfirmations;
    uint static eventRequiredRejects;
    uint static ethereumEventBlocksToConfirm;
    uint128 static eventInitialBalance;
    address static proxyAddress;
    address static bridgeAddress;

    uint requiredConfirmations;
    uint requiredRejects;

    TvmCell ethereumEventCode;

    uint[] confirmKeys;
    uint[] rejectKeys;

    // Error codes
    uint MSG_SENDER_NOT_BRIDGE = 202;
    uint EVENT_CONFIGURATION_NOT_ACTIVE = 203;
    uint KEY_ALREADY_USED = 204;

    bool active = false;

    modifier onlyBridge() {
        require(msg.sender == bridgeAddress, MSG_SENDER_NOT_BRIDGE);
        _;
    }

    event NewEthereumConfigurationConfiguration(uint relayKey);
    event NewEthereumConfigurationReject(uint relayKey);
    event NewEthereumEventConfirmation(address indexed addr, uint relayKey);
    event NewEthereumEventReject(address indexed addr, uint relayKey);

    /*
        Contract with Ethereum-TON configuration
        @dev Created only by Bridge contract
        @param _requiredConfirmations Required confirmations to activate configuration
        @param _requiredRejects Required confirmations to reject configuration
        @param _ethereumEventCode Code for Ethereum-TON event contract
        @param relayKey Public key of the relay, who initiated the config creation
    */
    constructor(
        uint _requiredConfirmations,
        uint _requiredRejects,
        TvmCell _ethereumEventCode,
        uint relayKey
    ) public {
        tvm.accept();

        requiredConfirmations = _requiredConfirmations;
        requiredRejects = _requiredRejects;

        ethereumEventCode = _ethereumEventCode;

        confirm(relayKey);
    }

    /*
        Confirm the configuration. If enough confirmations is collected, configuration turns active.
        @dev Should be called only through Bridge contract
        @param relayKey Public key of the relay, who initiated the config confirmation
    */
    function confirm(uint relayKey) public onlyBridge {
        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, KEY_ALREADY_USED);
        }

        confirmKeys.push(relayKey);

        emit NewEthereumConfigurationConfiguration(relayKey);

        if (confirmKeys.length >= requiredConfirmations) {
            active = true;
        }
    }

    // TODO: add reject logic
    function reject(uint relayKey) public view onlyBridge {
        emit NewEthereumConfigurationReject(relayKey);
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
    ) public onlyBridge {
        require(active, EVENT_CONFIGURATION_NOT_ACTIVE);

        address ethereumEventAddress = new EthereumEvent{
            value: eventInitialBalance,
            code: ethereumEventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                proxyAddress: proxyAddress,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                ethereumEventConfirguration: address(this)
            }
        }(
            relayKey,
            eventRequiredConfirmations,
            eventRequiredRejects
        );

        EthereumEvent(ethereumEventAddress).confirm{value: 1 ton}(relayKey);

        emit NewEthereumEventConfirmation(ethereumEventAddress, relayKey);
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
    ) public onlyBridge {
        // TODO: remove deploy step in favor of address derivation (not supported by compiler yet)
        address ethereumEventAddress = new EthereumEvent{
            value: 0 ton,
            code: ethereumEventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                proxyAddress: proxyAddress,
                eventData: eventData,
                eventBlockNumber: eventBlockNumber,
                eventBlock: eventBlock,
                ethereumEventConfirguration: address(this)
            }
        }(
            relayKey,
            eventRequiredConfirmations,
            eventRequiredRejects
        );

        EthereumEvent(ethereumEventAddress).reject{value: 1 ton}(relayKey);

        emit NewEthereumEventReject(ethereumEventAddress, relayKey);
    }

    /*
        Get configuration details.
        @returns _eventABI Ethereum event ABI
        @returns _eventAddress Ethereum event address
        @returns _proxyAddress proxy contract address
        @returns _ethereumEventBlocksToConfirm Ethereum blocks to wait before submit confirmation
        @returns _requiredConfirmations amount of required confirmations
        @returns _requiredRejects amount of required rejects
        @returns _confirmKeys list of confirm keys
        @returns _rejectKeys list of reject keys
        @returns _active Status of configuration - enabled / disabled
    */
    function getDetails() public view returns(
        bytes _eventABI,
        bytes _eventAddress,
        address _proxyAddress,
        uint _ethereumEventBlocksToConfirm,
        uint _requiredConfirmations,
        uint _requiredRejects,
        uint _eventRequiredConfirmations,
        uint _eventRequiredRejects,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bool _active
    ) {
        return (
            eventABI,
            eventAddress,
            proxyAddress,
            ethereumEventBlocksToConfirm,
            requiredConfirmations,
            requiredRejects,
            eventRequiredConfirmations,
            eventRequiredRejects,
            confirmKeys,
            rejectKeys,
            active
        );
    }
}
