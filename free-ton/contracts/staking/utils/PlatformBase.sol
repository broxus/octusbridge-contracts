pragma ton-solidity ^0.39.0;

abstract contract PlatformBase {
    address public /*static*/ root;
    TvmCell public /*static*/ platformCode;

    modifier onlyRoot() {
        require(msg.sender == root, 101);
        _;
    }

    constructor() public { revert(); }
}