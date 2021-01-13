// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/SafeMath.sol";
import "./utils/DistributedOwnable.sol";
import "./interfaces/IBridge.sol";


/**
    @title Basic smart contract for implementing Bridge logic.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract Bridge is DistributedOwnable, IBridge {
    using SafeMath for uint;

    // TODO: discuss atomic update or atomic event apply
    // TODO: add nonce support
    // Currently order is not guaranteed

    struct BridgeConfiguration {
        uint16 bridgeConfigurationUpdateRequiredConfirmations;
        uint16 bridgeRelayUpdateRequiredConfirmations;
    }

    struct BridgeRelay {
        address account;
        bool action;
    }

    BridgeConfiguration public bridgeConfiguration;

    /**
        @notice Bridge constructor
        @param owners Initial list of owners addresses
    **/
    constructor(
        address[] memory owners
    ) DistributedOwnable(owners) public {}

    function isRelay(address candidate) override public view returns(bool) {
        return isOwner(candidate);
    }

    /**
     * @notice Count how much signatures are made by owners.
     * @param payload Bytes payload, which was signed
     * @param signatures Bytes array with payload signatures
    */
    function countRelaysSignatures(
        bytes memory payload,
        bytes[] memory signatures
    ) public override view returns(uint) {
        uint ownersConfirmations = 0;

        for (uint i=0; i<signatures.length; i++) {
            address signer = recoverSignature(payload, signatures[i]);

            if (isOwner(signer)) ownersConfirmations++;
        }

        return ownersConfirmations;
    }

    /*
        Update Bridge configuration
        @dev Check enough owners signed and apply update
        @param payload Bytes encoded BridgeConfiguration structure
    */
    function updateBridgeConfiguration(
        bytes memory payload,
        bytes[] memory signatures
    ) public {
        require(
            countRelaysSignatures(
                payload,
                signatures
            ) >= bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations,
            'Not enough confirmations'
        );

        (BridgeConfiguration memory _bridgeConfiguration) = abi.decode(payload, (BridgeConfiguration));

        bridgeConfiguration = _bridgeConfiguration;
    }

    /*
        Update Bridge relay
        @dev Check enough owners signed and apply update
        @param payload Bytes encoded BridgeRelay structure
    */
    function updateBridgeRelay(
        bytes memory payload,
        bytes[] memory signatures
    ) public {
        require(
            countRelaysSignatures(
                payload,
                signatures
            ) >= bridgeConfiguration.bridgeRelayUpdateRequiredConfirmations,
            'Not enough confirmations'
        );

        (BridgeRelay memory bridgeRelay) = abi.decode(payload, (BridgeRelay));

        if (bridgeRelay.action) {
            grantOwnership(bridgeRelay.account);
        } else {
            removeOwnership(bridgeRelay.account);
        }
    }
}
