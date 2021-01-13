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
     * @param payload - payload which was signed
     * @param signature - payload signature
    */
    function recoverSignature(
        bytes memory payload,
        bytes memory signature
    ) public pure returns(address) {
        return keccak256(payload).toBytesPrefixed().recover(signature);
    }

    /**
     * @dev Internal ownership granting.
     * @param newOwner - Account to grant ownership
    */
    function grantOwnership(address newOwner) internal {
        require(!_owners[newOwner], 'Already owner');

        _owners[newOwner] = true;
        ownersAmount++;

        emit OwnershipGranted(newOwner);
    }

    /**
     * @dev Internal ownership removing.
     * @param ownerToRemove - Account to remove ownership
    */
    function removeOwnership(address ownerToRemove) internal {
        require(_owners[ownerToRemove], 'Not an owner');

        _owners[ownerToRemove] = false;
        ownersAmount--;

        emit OwnershipRemoved(ownerToRemove);
    }
}
