pragma solidity ^0.6.0;


contract Ownable {
    mapping (address => bool) private _owners;
    uint public ownersAmount;

    event OwnershipGranted(address indexed newOwner);
    event OwnershipRemoved(address indexed removedOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () public {
        _owners[msg.sender] = true;
        ownersAmount = 1;

        emit OwnershipGranted(msg.sender);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isSenderOwner(), "Ownable: caller is not the owner");
        _;
    }

    function isOwner(address checkAddr) public view returns (bool) {
        return _owners[checkAddr];
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isSenderOwner() public view returns (bool) {
        return isOwner(msg.sender);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function grantOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        ownersAmount += 1;

        _owners[newOwner] = true;
        emit OwnershipGranted(newOwner);
    }

    function removeOwnership(address ownerToRemove) public onlyOwner {
        require(ownersAmount > 1, "Ownable: impossible to remove ownership if only one owner exists");
        ownersAmount -= 1;

        _owners[ownerToRemove] = false;
        emit OwnershipRemoved(ownerToRemove);
    }
}
