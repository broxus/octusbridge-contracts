// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";
import "../../interfaces/IEverscale.sol";

import "../storage/VaultStorageReentrancyGuard.sol";
import "../storage/VaultStorageVault.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../helpers/VaultHelperPendingWithdrawals.sol";
import "../helpers/VaultHelperRoles.sol";
import "../helpers/VaultHelperEmergency.sol";
import "../helpers/VaultHelperEverscale.sol";
import "../helpers/VaultHelperWithdrawPeriods.sol";
import "../helpers/VaultHelperTokenBalance.sol";


contract VaultFacetPending_Withdrawals is
    VaultHelperPendingWithdrawals,
    VaultHelperRoles,
    VaultHelperEmergency,
    VaultHelperEverscale,
    VaultHelperTokenBalance,
    VaultHelperWithdrawPeriods,
    IVaultFacetPendingWithdrawals
{
    using SafeERC20 for IERC20;

    /// @notice Changes pending withdrawal bounty for specific pending withdrawal
    /// @param id Pending withdrawal ID.
    /// @param bounty The new value for pending withdrawal bounty.
    function setPendingWithdrawalBounty(
        uint256 id,
        uint256 bounty
    )
        public
        override
        pendingWithdrawalOpened(PendingWithdrawalId(msg.sender, id))
    {
        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(PendingWithdrawalId(msg.sender, id));

        require(bounty <= pendingWithdrawal.amount);

        _pendingWithdrawalBountyUpdate(PendingWithdrawalId(msg.sender, id), bounty);
    }

    /// @notice Changes the value of `withdrawLimitPerPeriod`
    /// This may only be called by `governance`
    /// @param _withdrawLimitPerPeriod The new withdraw limit per period to use.
    function setWithdrawLimitPerPeriod(
        uint256 _withdrawLimitPerPeriod
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.withdrawLimitPerPeriod = _withdrawLimitPerPeriod;

        emit UpdateWithdrawLimitPerPeriod(s.withdrawLimitPerPeriod);
    }

    /// @notice Changes the value of `undeclaredWithdrawLimit`
    /// This may only be called by `governance`
    /// @param _undeclaredWithdrawLimit The new undeclared withdraw limit to use.
    function setUndeclaredWithdrawLimit(
        uint256 _undeclaredWithdrawLimit
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.undeclaredWithdrawLimit = _undeclaredWithdrawLimit;

        emit UpdateUndeclaredWithdrawLimit(s.undeclaredWithdrawLimit);
    }
    /// @notice Force user's pending withdraw. Works only if Vault has enough
    ///    tokens on its balance.
    ///    This may only be called by wrapper.
    /// @param pendingWithdrawalId Pending withdrawal ID
    function forceWithdraw(
        PendingWithdrawalId memory pendingWithdrawalId
    )
        public
        override
        onlyEmergencyDisabled
        pendingWithdrawalOpened(pendingWithdrawalId)
        pendingWithdrawalApproved(pendingWithdrawalId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        IERC20(s.token).safeTransfer(
            pendingWithdrawalId.recipient,
            pendingWithdrawal.amount
        );

        _pendingWithdrawalAmountReduce(pendingWithdrawalId, pendingWithdrawal.amount);

        emit PendingWithdrawalForce(pendingWithdrawalId.recipient, pendingWithdrawalId.id);
    }

    /// @notice Multicall for `forceWithdraw`
    /// @param pendingWithdrawalId List of pending withdrawal IDs
    function forceWithdraw(
        PendingWithdrawalId[] memory pendingWithdrawalId
    ) external override {
        for (uint i = 0; i < pendingWithdrawalId.length; i++) {
            forceWithdraw(pendingWithdrawalId[i]);
        }
    }

    /// @notice Set approve status for pending withdrawal.
    ///    Pending withdrawal must be in `Required` (1) approve status, so approve status can be set only once.
    ///    If Vault has enough tokens on its balance - withdrawal will be filled immediately.
    ///    This may only be called by `governance` or `withdrawGuardian`.
    /// @param pendingWithdrawalId Pending withdrawal ID.
    /// @param approveStatus Approve status. Must be `Approved` (2) or `Rejected` (3).
    function setPendingWithdrawalApprove(
        PendingWithdrawalId memory pendingWithdrawalId,
        ApproveStatus approveStatus
    )
        public
        override
        onlyGovernanceOrWithdrawGuardian
        pendingWithdrawalOpened(pendingWithdrawalId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(pendingWithdrawal.approveStatus == ApproveStatus.Required);

        require(
            approveStatus == ApproveStatus.Approved ||
            approveStatus == ApproveStatus.Rejected
        );

        _pendingWithdrawalApproveStatusUpdate(pendingWithdrawalId, approveStatus);

        // Fill approved withdrawal
        if (approveStatus == ApproveStatus.Approved && pendingWithdrawal.amount <= _vaultTokenBalance()) {
            _pendingWithdrawalAmountReduce(pendingWithdrawalId, pendingWithdrawal.amount);

            IERC20(s.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount
            );

            emit PendingWithdrawalWithdraw(
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id,
                pendingWithdrawal.amount,
                pendingWithdrawal.amount
            );
        }

        // Update withdrawal period considered amount
        _withdrawalPeriodIncreaseConsideredByTimestamp(
            pendingWithdrawal.timestamp,
            pendingWithdrawal.amount
        );
    }

    function pendingWithdrawals(
        address user,
        uint256 id
    ) external view override returns (PendingWithdrawalParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.pendingWithdrawals_[user][id];
    }

    /// @notice Multicall for `setPendingWithdrawalApprove`.
    /// @param pendingWithdrawalId List of pending withdrawals IDs.
    /// @param approveStatus List of approve statuses.
    function setPendingWithdrawalApprove(
        PendingWithdrawalId[] memory pendingWithdrawalId,
        ApproveStatus[] memory approveStatus
    ) external override {
        require(pendingWithdrawalId.length == approveStatus.length);

        for (uint i = 0; i < pendingWithdrawalId.length; i++) {
            setPendingWithdrawalApprove(pendingWithdrawalId[i], approveStatus[i]);
        }
    }

    /**
        @notice Cancel pending withdrawal partially or completely.
        This may only be called by pending withdrawal recipient.
        @param id Pending withdrawal ID
        @param amount Amount to cancel, should be less or equal than pending withdrawal amount
        @param recipient Tokens recipient, in Everscale network
        @param bounty New value for bounty
    */
    function cancelPendingWithdrawal(
        uint256 id,
        uint256 amount,
        IEverscale.EverscaleAddress memory recipient,
        uint bounty
    )
        external
        override
        onlyEmergencyDisabled
        pendingWithdrawalApproved(PendingWithdrawalId(msg.sender, id))
        pendingWithdrawalOpened(PendingWithdrawalId(msg.sender, id))
    {
        PendingWithdrawalId memory pendingWithdrawalId = PendingWithdrawalId(msg.sender, id);
        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(amount > 0 && amount <= pendingWithdrawal.amount);

        _transferToEverscale(recipient, amount);

        _pendingWithdrawalAmountReduce(pendingWithdrawalId, amount);

        emit PendingWithdrawalCancel(msg.sender, id, amount);

        setPendingWithdrawalBounty(id, bounty);
    }

    function withdrawalPeriods(
        uint256 withdrawalPeriodId
    ) external view override returns (WithdrawalPeriodParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawalPeriods_[withdrawalPeriodId];
    }

    function withdrawLimitPerPeriod() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawLimitPerPeriod;
    }

    function undeclaredWithdrawLimit() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.undeclaredWithdrawLimit;
    }

    function pendingWithdrawalsTotal() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.pendingWithdrawalsTotal;
    }

    function pendingWithdrawalsPerUser(address user) external view override returns (uint) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.pendingWithdrawalsPerUser[user];
    }
}
