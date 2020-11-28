pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './EthereumEvent.sol';


contract EthereumEventConfiguration {
    bytes static eventABI;
    bytes static eventAddress;
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

    event ConfirmEthereumEvent(address indexed ethereumEventAddress);

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

        if (confirmKeys.length >= requiredConfirmations) {
            active = true;
        }
    }

    // TODO: add reject logic
    function reject(uint relayKey) public view onlyBridge {
        require(relayKey > 0);
    }

    /*
        Confirm Ethereum-TON event instance. Works only when configuration is active.
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one is always fail
        EventAddress is always emitted!
        @param eventTransaction Bytes encoded transaction hash
        @param eventIndex Event Index from the transaction
        @param eventData TvmCell encoded event data
        @param relayKey Relay key, who initialized the Bridge Ethereum event confirmation
    **/
    function confirmEvent(
        bytes eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint relayKey
    ) public onlyBridge {
        require(active, EVENT_CONFIGURATION_NOT_ACTIVE);

        address ethereumEventAddress = new EthereumEvent{
            value: 1 ton,
            code: ethereumEventCode,
            pubkey: tvm.pubkey(),
            varInit: {
                eventTransaction: eventTransaction,
                eventIndex: eventIndex,
                proxyAddress: proxyAddress,
                eventData: eventData,
                ethereumEventConfirguration: address(this)
            }
        }(
            relayKey
        );

        EthereumEvent(ethereumEventAddress).confirm(relayKey);

        emit ConfirmEthereumEvent(ethereumEventAddress);
    }

    /*
        Get configuration details.
        @returns Ethereum event ABI, Ethereum event address, Proxy contract address,
        amount of required confirmations, amount of required rejects,
        list of confirm keys, list of reject keys, enabled / disabled
    */
    function getDetails() public view returns(
        bytes _eventABI,
        bytes _eventAddress,
        address _proxyAddress,
        uint _requiredConfirmations,
        uint _requiredRejects,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bool _active
    ) {
        tvm.accept();

        return (
            eventABI,
            eventAddress,
            proxyAddress,
            requiredConfirmations,
            requiredRejects,
            confirmKeys,
            rejectKeys,
            active
        );
    }
}
