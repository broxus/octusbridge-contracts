// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./../libraries/ECDSA.sol";


contract DistributedOwnable {
    using ECDSA for bytes32;

    mapping (address => bool) private _owners;
    uint public ownersAmount;

    event OwnershipGranted(address indexed newOwner);
    event OwnershipRemoved(address indexed removedOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     * @param owners - List of initial owners addresses
     */
    constructor(
        address[] memory owners
    ) public {
        for (uint i=0; i < owners.length; i++) {
            grantOwnership(owners[i]);
        }
    }

    /**
     * @notice Check if account has ownership
     * @param checkAddr Address to be checked
     * @return Boolean status of the address
     */
    function isOwner(address checkAddr) public view returns (bool) {
        return _owners[checkAddr];
    }

    /**
     * @dev Handy wrapper for Solidity recover function. Returns signature author address.
     * @param receipt - payload which was signed
     * @param signature - payload signature
    */
    function recoverSignature(bytes memory receipt, bytes memory signature) public pure returns(address) {
        return keccak256(receipt).toBytesPrefixed().recover(signature);
    }

    /**
     * @notice Count how much signatures are made by owners.
     * @param receipt Bytes payload, which was signed
     * @param signatures Bytes array with payload signatures
    */
    function countOwnersSignatures(
        bytes memory receipt,
        bytes[] memory signatures
    ) public view returns(uint) {
        uint ownersConfirmations = 0;

        for (uint i=0; i<signatures.length; i++) {
            address signer = recoverSignature(receipt, signatures[i]);

            if (isOwner(signer)) ownersConfirmations++;
        }

        return ownersConfirmations;
    }

    /**
     * @dev Internal ownership granting.
     * @param newOwner - Account to grant ownership
    */
    function grantOwnership(address newOwner) internal {
        _owners[newOwner] = true;
        ownersAmount++;

        emit OwnershipGranted(newOwner);
    }

    /**
     * @dev Internal ownership removing.
     * @param ownerToRemove - Account to remove ownership
    */
    function removeOwnership(address ownerToRemove) internal {
        _owners[ownerToRemove] = false;
        ownersAmount--;

        emit OwnershipRemoved(ownerToRemove);
    }
}
