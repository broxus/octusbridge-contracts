// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;


contract BridgeMockup {
    function verifySignedTonEvent(
        bytes memory payload,
        bytes[] memory signatures
    ) external view returns(uint32) {
        return 0;
    }
}
