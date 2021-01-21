pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
    This is an example of Token contract for tests
*/
contract TestToken is ERC20 {
    constructor() public ERC20("TestToken", "TST") {
        _mint(msg.sender, 100000 ether);
    }
}
