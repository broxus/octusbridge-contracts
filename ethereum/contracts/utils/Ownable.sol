pragma solidity ^0.8.0;


contract Ownable {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: not owner");
        _;
    }

    function _transferOwnership(address newOwner) internal {
        owner = newOwner;
    }
}
