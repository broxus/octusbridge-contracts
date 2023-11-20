// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;



abstract contract Cache {
    mapping (bytes32 => bool) public cache;
    uint256[49] __gap;

    modifier notCached(bytes memory payload) {
        bytes32 hash_ = keccak256(abi.encode(payload));

        require(cache[hash_] == false, "Cache: payload already seen");

        _;

        cache[hash_] = true;
    }
}
