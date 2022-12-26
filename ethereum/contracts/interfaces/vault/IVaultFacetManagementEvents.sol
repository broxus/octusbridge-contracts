// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


interface IVaultFacetManagementEvents {
    event UpdateBridge(address bridge);
    event UpdateConfiguration(int128 wid, uint256 addr);
    event UpdateTargetDecimals(uint256 targetDecimals);
    event UpdateRewards(int128 wid, uint256 addr);

    event UpdatePerformanceFee(uint256 performanceFee);
    event UpdateManagementFee(uint256 managenentFee);

    event UpdateGovernance(address governance);
    event UpdateManagement(address management);
    event NewPendingGovernance(address governance);
    event UpdateGuardian(address guardian);
    event UpdateWithdrawGuardian(address withdrawGuardian);

    event EmergencyShutdown(bool active);
}
