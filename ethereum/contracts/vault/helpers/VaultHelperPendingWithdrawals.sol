// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";
import "../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";
import "../../interfaces/vault/IVaultFacetPendingWithdrawalsEvents.sol";


abstract contract VaultHelperPendingWithdrawals is IVaultFacetPendingWithdrawalsEvents {
    modifier pendingWithdrawalOpened(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
    ) {
        IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(pendingWithdrawal.amount > 0, "Vault: pending withdrawal closed");

        _;
    }

    modifier pendingWithdrawalApproved(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
    ) {
        IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(
            pendingWithdrawal.approveStatus == IVaultFacetPendingWithdrawals.ApproveStatus.NotRequired ||
            pendingWithdrawal.approveStatus == IVaultFacetPendingWithdrawals.ApproveStatus.Approved,
            "Vault: pending withdrawal not approved"
        );

        _;
    }

    function _pendingWithdrawal(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
    ) internal view returns (IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id];
    }

    function _pendingWithdrawalCreate(
        address recipient,
        uint256 amount,
        uint256 timestamp
    ) internal returns (uint256 pendingWithdrawalId) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        pendingWithdrawalId = s.pendingWithdrawalsPerUser[recipient];
        s.pendingWithdrawalsPerUser[recipient]++;

        s.pendingWithdrawals_[recipient][pendingWithdrawalId] = IVaultFacetPendingWithdrawals.PendingWithdrawalParams({
            amount: amount,
            timestamp: timestamp,
            bounty: 0,
            approveStatus: IVaultFacetPendingWithdrawals.ApproveStatus.NotRequired
        });

        s.pendingWithdrawalsTotal += amount;

        return pendingWithdrawalId;
    }

    function _pendingWithdrawalBountyUpdate(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId,
        uint bounty
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].bounty = bounty;

        emit PendingWithdrawalUpdateBounty(pendingWithdrawalId.recipient, pendingWithdrawalId.id, bounty);
    }

    function _pendingWithdrawalAmountReduce(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId,
        uint amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].amount -= amount;
        s.pendingWithdrawalsTotal -= amount;
    }

    function _pendingWithdrawalApproveStatusUpdate(
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId,
        IVaultFacetPendingWithdrawals.ApproveStatus approveStatus
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].approveStatus = approveStatus;

        emit PendingWithdrawalUpdateApproveStatus(
            pendingWithdrawalId.recipient,
            pendingWithdrawalId.id,
            approveStatus
        );
    }
}
