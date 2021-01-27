// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


import "@openzeppelin/contracts/math/SafeMath.sol";
import "./utils/DistributedOwnable.sol";
import "./interfaces/IBridge.sol";
import "./utils/Nonce.sol";
import "./utils/RedButton.sol";

/**
    @title Basic smart contract for implementing Bridge logic.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract Bridge is DistributedOwnable, RedButton, Nonce, IBridge {
    using SafeMath for uint;

    struct BridgeConfiguration {
        uint16 nonce;
        uint16 bridgeUpdateRequiredConfirmations;
    }

    struct BridgeRelay {
        uint16 nonce;
        address account;
        bool action;
    }

    BridgeConfiguration public bridgeConfiguration;

    /**
        @notice Bridge constructor
        @param owners Initial list of owners addresses
        @param admin Red button caller, probably multisig
    **/
    constructor(
        address[] memory owners,
        address admin
    ) DistributedOwnable(owners) public {
        setAdmin(admin);
    }

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
            ) >= bridgeConfiguration.bridgeUpdateRequiredConfirmations,
            'Not enough confirmations'
        );

        (BridgeConfiguration memory _bridgeConfiguration) = abi.decode(payload, (BridgeConfiguration));

        require(nonceNotUsed(_bridgeConfiguration.nonce), 'Nonce already used');

        bridgeConfiguration = _bridgeConfiguration;

        rememberNonce(_bridgeConfiguration.nonce);
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
            ) >= bridgeConfiguration.bridgeUpdateRequiredConfirmations,
            'Not enough confirmations'
        );

        (BridgeRelay memory bridgeRelay) = abi.decode(payload, (BridgeRelay));

        require(nonceNotUsed(bridgeRelay.nonce), 'Nonce already used');

        if (bridgeRelay.action) {
            grantOwnership(bridgeRelay.account);
        } else {
            removeOwnership(bridgeRelay.account);
        }

        rememberNonce(bridgeRelay.nonce);
    }
}
