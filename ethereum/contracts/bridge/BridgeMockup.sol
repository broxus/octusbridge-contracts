// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


contract BridgeMockup {
    function verifySignedEverscaleEvent(
        bytes memory payload,
        bytes[] memory signatures
    ) external view returns (uint32) {
        return 0;
    }
}
