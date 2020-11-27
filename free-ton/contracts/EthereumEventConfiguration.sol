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

    mapping(uint => uint) confirmKeys;
    mapping(uint => uint) rejectKeys;

    // Error codes
    uint MSG_SENDER_NOT_BRIDGE = 202;
    uint EVENT_CONFIGURATION_NOT_ACTIVE = 203;

    bool active = false;

    modifier onlyBridge() {
        require(msg.sender == bridgeAddress, MSG_SENDER_NOT_BRIDGE);
        _;
    }

    event ConfirmEthereumEvent(address indexed ethereumEventAddress);

    constructor(
        uint _requiredConfirmations,
        uint _requiredRejects,
        TvmCell _ethereumEventCode
//        uint relayKey
    ) public {
        tvm.accept();

        requiredConfirmations = _requiredConfirmations;
        requiredRejects = _requiredRejects;
        ethereumEventCode = _ethereumEventCode;

//        confirm(relayKey);
    }

    function getArrayOfConfirmKeys() public view returns(uint[] keys) {
        optional(uint, uint) relayKey = confirmKeys.min();

        while (relayKey.hasValue()) {
            (uint key, ) = relayKey.get();

            keys[keys.length] = key;
        }
    }


    function getArrayOfRejectKeys() public view returns(uint[] keys) {
        optional(uint, uint) relayKey = rejectKeys.min();

        while (relayKey.hasValue()) {
            (uint key, ) = relayKey.get();

            keys[keys.length] = key;
        }

    }

    function confirm(uint relayKey) public onlyBridge {
//        require(
//            confirmKeys.add(relayKey, true) == true,
//            203
//        );
//    confirmKeys[relayKey] = 1;

        // TODO: fix issue with 50 error code on adding key to the confirmed keys mapping
        require(relayKey > 0);
        active = true;

//        if (active) {
//            address ethereumRootContractAddress = deployRootContract();
//
//            emit EthereumRootEventDeployedEvent(ethereumRootContractAddress);
//        }

//        if (getArrayOfConfirmKeys().length >= requiredConfirmations) {
//            active = true;
//        }
    }

    /*
        Confirm Ethereum-TON event instance. Works only when configuration is active.
        @dev This function either deploy EthereumEvent or confirm it
        Two transactions is sent (deploy and confirm) and one of it always fail
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
            getArrayOfConfirmKeys(),
            getArrayOfRejectKeys(),
            active
        );
    }
}
