// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;


interface IBridge {
    function isRelay(address candidate) returns (bool);
}
