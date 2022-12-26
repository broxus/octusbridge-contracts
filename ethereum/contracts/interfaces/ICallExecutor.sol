// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


interface ICallExecutor {
    function execute(
        address target,
        bytes memory data,
        bool success_required
    ) external;
}
