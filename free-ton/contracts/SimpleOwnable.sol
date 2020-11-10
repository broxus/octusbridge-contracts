pragma solidity >= 0.5.0;

contract SimpleOwnable {
    address private _owner;

    constructor() public {
        _owner = msg.sender;
    }

    function isOwner() public view returns (bool) {
        return _owner == msg.sender;
    }

    modifier onlyOwner() {
        require(isOwner(), 100);
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        _owner = newOwner;
    }
}
