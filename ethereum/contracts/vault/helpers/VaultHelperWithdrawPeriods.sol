// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";
import "../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";


abstract contract VaultHelperWithdrawPeriods {
    function _withdrawalPeriodDeriveId(
        uint256 timestamp
    ) internal pure returns (uint256) {
        return timestamp / VaultStorageVault.WITHDRAW_PERIOD_DURATION_IN_SECONDS;
    }

    function _withdrawalPeriod(
        uint256 timestamp
    ) internal view returns (IVaultFacetPendingWithdrawals.WithdrawalPeriodParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawalPeriods_[_withdrawalPeriodDeriveId(timestamp)];
    }

    function _withdrawalPeriodIncreaseTotalByTimestamp(
        uint256 timestamp,
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint withdrawalPeriodId = _withdrawalPeriodDeriveId(timestamp);

        s.withdrawalPeriods_[withdrawalPeriodId].total += amount;
    }

    function _withdrawalPeriodIncreaseConsideredByTimestamp(
        uint256 timestamp,
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint withdrawalPeriodId = _withdrawalPeriodDeriveId(timestamp);

        s.withdrawalPeriods_[withdrawalPeriodId].considered += amount;
    }

    function _withdrawalPeriodCheckLimitsPassed(
        uint amount,
        IVaultFacetPendingWithdrawals.WithdrawalPeriodParams memory withdrawalPeriod
    ) internal view returns (bool) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return  amount < s.undeclaredWithdrawLimit &&
            amount + withdrawalPeriod.total - withdrawalPeriod.considered < s.withdrawLimitPerPeriod;
    }

    function _getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}
