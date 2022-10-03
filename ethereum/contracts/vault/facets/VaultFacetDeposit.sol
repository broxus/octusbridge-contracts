// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../../interfaces/IEverscale.sol";
import "../../interfaces/vault/IVaultFacetDeposit.sol";
import "../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";

import "../helpers/VaultHelperPendingWithdrawals.sol";
import "../helpers/VaultHelperEmergency.sol";
import "../helpers/VaultHelperDeposit.sol";
import "../helpers/VaultHelperFee.sol";

import "../storage/VaultStorageVault.sol";
import "../storage/VaultStorageReentrancyGuard.sol";
import "../helpers/VaultHelperReentrancyGuard.sol";
import "../helpers/VaultHelperRoles.sol";
import "../helpers/VaultHelperEverscale.sol";


import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract VaultFacetDeposit is
    VaultHelperPendingWithdrawals,
    VaultHelperEmergency,
    VaultHelperDeposit,
    VaultHelperFee,
    VaultHelperRoles,
    VaultHelperEverscale,
    VaultHelperReentrancyGuard,
    IVaultFacetDeposit
{
    using SafeERC20 for IERC20;

    /// @notice Deposits `token` into the Vault, leads to producing corresponding token
    /// on the Everscale side.
    /// @param recipient Recipient in the Everscale network
    /// @param amount Amount of `token` to deposit
    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        uint256 amount
    )
        public
        override
        onlyEmergencyDisabled
        respectDepositLimit(amount)
        nonReentrant
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        IERC20(s.token).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        uint256 fee = _calculateMovementFee(amount, s.depositFee);

        _transferToEverscale(
            recipient,
            amount - fee
        );

        if (fee > 0) s.fees += fee;

        emit UserDeposit(
            msg.sender,
            recipient.wid,
            recipient.addr,
            amount,
            address(0),
            0,
            0
        );
    }

    /**
        @notice Same as regular `deposit`, but fill multiple pending withdrawals.
        @param recipient Deposit recipient in the Everscale network.
        @param amount Deposit amount
        @param expectedMinBounty Expected min bounty amount, frontrun protection
        @param pendingWithdrawalIds List of pending withdrawals to close.
    */
    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        uint256 amount,
        uint256 expectedMinBounty,
        IVaultFacetPendingWithdrawals.PendingWithdrawalId[] memory pendingWithdrawalIds
    ) external override {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint amountLeft = amount;
        uint amountPlusBounty = amount;

        IERC20(s.token).safeTransferFrom(msg.sender, address(this), amount);

        for (uint i = 0; i < pendingWithdrawalIds.length; i++) {
            IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId = pendingWithdrawalIds[i];
            IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

            // TODO: continue instead of revert?
            require(pendingWithdrawal.amount > 0);
            require(
                pendingWithdrawal.approveStatus == IVaultFacetPendingWithdrawals.ApproveStatus.NotRequired ||
                pendingWithdrawal.approveStatus == IVaultFacetPendingWithdrawals.ApproveStatus.Approved
            );

            amountLeft -= pendingWithdrawal.amount;
            amountPlusBounty += pendingWithdrawal.bounty;

            _pendingWithdrawalAmountReduce(
                pendingWithdrawalId,
                pendingWithdrawal.amount
            );

            IERC20(s.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount - pendingWithdrawal.bounty
            );

            emit UserDeposit(
                msg.sender,
                recipient.wid,
                recipient.addr,
                pendingWithdrawal.amount,
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id,
                pendingWithdrawal.bounty
            );
        }

        require(amountPlusBounty - amount >= expectedMinBounty);

        uint256 fee = _calculateMovementFee(amountPlusBounty, s.depositFee);

        _transferToEverscale(recipient, amountPlusBounty - fee);

        if (amountLeft > 0) {
            emit UserDeposit(
                msg.sender,
                recipient.wid,
                recipient.addr,
                amountLeft,
                address(0),
                0,
                0
            );
        }

        if (fee > 0) s.fees += fee;
    }

    function availableDepositLimit()
        external
        view
        override
        returns (uint256)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        if (s.depositLimit > _totalAssets()) {
            return s.depositLimit - _totalAssets();
        }

        return 0;
    }

    function depositLimit()
        external
        view
        override
        returns (uint256)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.depositLimit;
    }

    /// @notice Changes the maximum amount of `token` that can be deposited in this Vault
    /// Note, this is not how much may be deposited by a single depositor,
    /// but the maximum amount that may be deposited across all depositors.
    /// This may be called only by `governance`
    /// @param limit The new deposit limit to use.
    function setDepositLimit(
        uint256 limit
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.depositLimit = limit;

        emit UpdateDepositLimit(s.depositLimit);
    }

    /**
        @notice Set deposit fee. Must be less than `MAX_BPS`.
        This may be called only by `governance` or `management`.
        @param _depositFee Deposit fee, must be less than `MAX_BPS / 2`.
    */
    function setDepositFee(
        uint _depositFee
    ) external override onlyGovernanceOrManagement {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(_depositFee <= VaultStorageVault.MAX_BPS / 2);

        s.depositFee = _depositFee;

        emit UpdateDepositFee(s.depositFee);
    }

    function depositFee() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.depositFee;
    }
}
