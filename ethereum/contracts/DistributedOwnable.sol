pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/ECDSA.sol";


contract DistributedOwnable {
    using ECDSA for bytes32;

    mapping (address => bool) private _owners;
    uint public ownersAmount;

    event OwnershipGranted(address indexed newOwner);
    event OwnershipRemoved(address indexed removedOwner);

    uint public requiredOwnersToExecuteCall;
    uint public requiredOwnersToUpdateOwners;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     * @param owners - List of initial owners addresses
     * @param initialRequiredOwnersToExecuteCall - Initial value for required owners amount to execute call operation
     * @param initialRequiredOwnersToUpdateOwners - Initial value for required owners amount to update owners set
     */
    constructor(
        address[] memory owners,
        uint initialRequiredOwnersToExecuteCall,
        uint initialRequiredOwnersToUpdateOwners
    ) public {
        for (uint i=0; i < owners.length; i++) {
            _owners[owners[i]] = true;
        }

        requiredOwnersToExecuteCall = initialRequiredOwnersToExecuteCall;
        requiredOwnersToUpdateOwners = initialRequiredOwnersToUpdateOwners;
    }

    /**
     * @dev Returns true is the account is owner
     * @param checkAddr - account to be checked
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
     * @dev Count how much signatures are made by owners.
     * @param receipt - payload which was signed
     * @param signatures - payload signatures
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
     * @dev Throws an error in case not enough owners confirmations have been provided
     * @param receipt - payload which was signed
     * @param signatures - array of signatures
     * @param requiredOwnersSignatures - minimum amount of owners signatures that should be provided
     */
    modifier enoughOwnersSigned(
        bytes memory receipt,
        bytes[] memory signatures,
        uint requiredOwnersSignatures
    ) {
        uint ownersSignatures = countOwnersSignatures(
            receipt,
            signatures
        );

        require(
            ownersSignatures >= requiredOwnersSignatures,
            "Ownable: not enough owners signed"
        );

        _;
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

    /**
     * @dev Internal update for setting "required owners to update owners"
     * @param newRequiredOwnersToUpdateOwners - new setting value
    */
    function updateRequiredOwnersToUpdateOwners(
        uint newRequiredOwnersToUpdateOwners
    ) internal {
        requiredOwnersToUpdateOwners = newRequiredOwnersToUpdateOwners;
    }

    /**
     * @dev Internal update for setting "required owners to execute call"
     * @param newRequiredOwnersToExecuteCall - new setting value
    */
    function updateRequiredOwnersToExecuteCall(
        uint newRequiredOwnersToExecuteCall
    ) internal {
        requiredOwnersToExecuteCall = newRequiredOwnersToExecuteCall;
    }

    /**
     * @dev External function for updating owners set. Grants or remove ownership.
     *      Also update "required owners to update owners" setting
     * @param receipt - ABI encoded payload
     * @param signatures - bytes array with receipt signatures
    */
    function updateOwnership(
        bytes memory receipt,
        bytes[] memory signatures
    ) public enoughOwnersSigned(
        receipt,
        signatures,
        requiredOwnersToUpdateOwners
    ) {
        (
            address target,
            uint newRequiredOwnersToUpdateOwners,
            // true means "grant ownership to target"
            // false means "remove ownership from target"
            bool action
        ) = abi.decode(
            receipt,
            (address, uint, bool)
        );

        if (action) {
            require(!isOwner(target), "Ownable: target account already owner");
            grantOwnership(target);
        } else {
            require(isOwner(target), "Ownable: target account not owner");
            removeOwnership(target);
        }

        require(
            newRequiredOwnersToUpdateOwners <= ownersAmount,
            "Ownable: wrong setting for update owners"
        );

        updateRequiredOwnersToUpdateOwners(newRequiredOwnersToUpdateOwners);
    }
}
