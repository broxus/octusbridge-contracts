## `DistributedOwnable`





### `enoughOwnersSigned(bytes receipt, bytes[] signatures, uint256 requiredOwnersSignatures)`



Throws an error in case not enough owners confirmations have been provided



### `constructor(address[] owners, uint256 initialRequiredOwnersToExecuteCall, uint256 initialRequiredOwnersToUpdateOwners)` (public)



Initializes the contract setting the deployer as the initial owner.


### `isOwner(address checkAddr) → bool` (public)



Returns true is the account is owner


### `recoverSignature(bytes receipt, bytes signature) → address` (public)



Handy wrapper for Solidity recover function. Returns signature author address.


### `countOwnersSignatures(bytes receipt, bytes[] signatures) → uint256` (public)



Count how much signatures are made by owners.


### `grantOwnership(address newOwner)` (internal)



Internal ownership granting.


### `removeOwnership(address ownerToRemove)` (internal)



Internal ownership removing.


### `updateRequiredOwnersToUpdateOwners(uint256 newRequiredOwnersToUpdateOwners)` (internal)



Internal update for setting "required owners to update owners"


### `updateRequiredOwnersToExecuteCall(uint256 newRequiredOwnersToExecuteCall)` (internal)



Internal update for setting "required owners to execute call"


### `updateOwnership(bytes receipt, bytes[] signatures)` (public)



External function for updating owners set. Grants or remove ownership.
Also update "required owners to update owners" setting



### `OwnershipGranted(address newOwner)`





### `OwnershipRemoved(address removedOwner)`





