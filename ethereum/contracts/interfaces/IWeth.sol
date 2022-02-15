// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


interface IWeth {
    function withdraw(uint wad) external;
    function deposit() external payable;
}
