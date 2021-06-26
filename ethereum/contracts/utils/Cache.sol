// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;


contract Cache {
    mapping (bytes32 => bool) public executed;

    modifier notCached(bytes memory payload) {
        bytes32 payloadHash = keccak256(abi.encode(payload));

        require(executed[payloadHash] == false, "Cache: payload already seen");

        _;

        executed[payloadHash] = true;
    }
}
