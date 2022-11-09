// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./interfaces/ICallExecutor.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract CallExecutor is ICallExecutor, ReentrancyGuardUpgradeable, OwnableUpgradeable {
    function execute(
        address target,
        bytes memory data
    ) external override onlyOwner nonReentrant {
        (bool success, ) = target.call(data);

        require(success);
    }
}
