pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import "./structures/BridgeConfigurationStructure.sol";


interface Bridge is BridgeConfigurationStructure {
    function updateBridgeConfiguration(BridgeConfiguration _bridgeConfiguration) external;
}


contract BridgeConfigurationUpdate is BridgeConfigurationStructure {
    address static bridgeAddress;

    BridgeConfiguration bridgeConfiguration;

    uint requiredConfirmations;
    uint requiredRejects;

    bool executed = false;

    uint[] confirmKeys;
    uint[] rejectKeys;

    /*
        Bridge configuration update contract. Any relay can initiate configuration update.
        New contract will be deployed. If enough confirmations received - the callback will be executed.
        TODO: add reject logic
        TODO: add TTL logic?
        @param relayKey Initial relay key, confirm by default
        @param _requiredConfirmations How much confirmation is required to accept update
        @param _requiredRejects How much rejects is required to reject update
        @param _bridgeConfiguration New Bridge configuration
    */
    constructor(
        uint relayKey,
        uint _requiredConfirmations,
        uint _requiredRejects,
        BridgeConfiguration _bridgeConfiguration
    ) public {
        tvm.accept();

        bridgeConfiguration = _bridgeConfiguration;

        requiredConfirmations = _requiredConfirmations;
        requiredRejects = _requiredRejects;

        confirm(relayKey);
    }

    modifier onlyBridge() {
        require(msg.sender == bridgeAddress, 12312);
        _;
    }

    /*
        Confirm the configuration. If enough confirmations is collected, configuration updates.
        @dev Should be called only through Bridge contract
        @param relayKey Public key of the relay, who initiated the confirmation
    */
    function confirm(uint relayKey) public onlyBridge {
        for (uint i=0; i<confirmKeys.length; i++) {
            require(confirmKeys[i] != relayKey, 12312);
        }

        confirmKeys.push(relayKey);

        if (confirmKeys.length >= requiredConfirmations) {
            executed = true;

            Bridge(bridgeAddress).updateBridgeConfiguration(bridgeConfiguration);
        }
    }

    /*
        Get all the details for BridgeConfigurationUpdate.
        @returns _bridgeConfiguration Proposed configuration
        @returns _requiredConfirmations How much confirmation is required to accept update
        @returns _requiredRejects How much rejects is required to reject update
        @returns _confirmKeys List of keys who confirmed the update
        @returns _rejectKeys List of keys who rejected the update
        @returns _executed Update status
    */
    function getDetails() public view returns(
        BridgeConfiguration _bridgeConfiguration,
        uint _requiredConfirmations,
        uint _requiredRejects,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bool _executed
    ) {
        return (
            bridgeConfiguration,
            requiredConfirmations,
            requiredRejects,
            confirmKeys,
            rejectKeys,
            executed
        );
    }
}
