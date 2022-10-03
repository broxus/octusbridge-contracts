// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";


abstract contract VaultHelperRoles {
    modifier onlyGovernance() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.governance);

        _;
    }

    modifier onlyPendingGovernance() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.pendingGovernance);

        _;
    }

    modifier onlyStrategyOrGovernanceOrGuardian(address strategyId) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == strategyId || msg.sender == s.governance || msg.sender == s.guardian);

        _;
    }

    modifier onlyGovernanceOrManagement() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.governance || msg.sender == s.management);

        _;
    }

    modifier onlyGovernanceOrGuardian() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.governance || msg.sender == s.guardian);

        _;
    }

    modifier onlyGovernanceOrWithdrawGuardian() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.governance || msg.sender == s.withdrawGuardian);

        _;
    }

    modifier onlyGovernanceOrStrategyRewardsManager(address strategyId) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(msg.sender == s.governance || msg.sender == s.strategies_[strategyId].rewardsManager);

        _;
    }
}
