// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;


interface IDAO {
    struct EthAction {
        uint value;
        uint160 target;
        string signature;
        bytes data;
    }

    function updateBridge(
        address _bridge
    ) external;

    function execute(
        bytes memory payload,
        bytes[] memory signatures
    ) external returns(bytes[] memory responses);
}
