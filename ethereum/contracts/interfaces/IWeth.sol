// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;


interface IWeth {
    function withdraw(uint wad) external;
    function deposit() external payable;
}
