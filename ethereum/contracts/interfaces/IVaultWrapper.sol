// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.2;


interface IVaultWrapper {
    function initialize(address _vault) external;
    function apiVersion() external view returns (string memory);
}
