// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


interface IBridge {
    function isRelay(address candidate) external view returns (bool);
    function countRelaysSignatures(
        bytes calldata payload,
        bytes[] calldata signatures
    ) external view returns(uint);
}
