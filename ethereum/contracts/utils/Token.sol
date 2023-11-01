// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Token is ERC20, Ownable {
    constructor(
        uint256 initialSupply,
        address receiver
    ) ERC20("Test USDT", "TESTUSDT") Ownable(msg.sender) {
        _mint(receiver, initialSupply);
    }

    function mint(
        address account,
        uint amount
    ) external onlyOwner {
        _mint(account, amount);
    }

    function burn(
        address account,
        uint amount
    ) external onlyOwner {
        _burn(account, amount);
    }
}
