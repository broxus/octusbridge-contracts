// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(
        uint256 initialSupply,
        address receiver
    ) ERC20("`Test USDT`", "TESTUSDT") {
        _mint(receiver, initialSupply);
    }
}
