// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "../../interfaces/multivault/IMultiVaultFacetDeposit.sol";
import "../../interfaces/multivault/IMultiVaultFacetFees.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokens.sol";
import "../../interfaces/multivault/IMultiVaultFacetPendingWithdrawals.sol";
import "../../interfaces/multivault/IMultiVaultFacetPendingWithdrawalsEvents.sol";
import "../../interfaces/IMultiVaultToken.sol";
import "../../interfaces/IEverscale.sol";
import "../../interfaces/IERC20.sol";

import "../../libraries/SafeERC20.sol";

import "../storage/MultiVaultStorage.sol";

import "../helpers/MultiVaultHelperEverscale.sol";
import "../helpers/MultiVaultHelperReentrancyGuard.sol";
import "../helpers/MultiVaultHelperTokens.sol";
import "../helpers/MultiVaultHelperFee.sol";
import "../helpers/MultiVaultHelperPendingWithdrawal.sol";


contract MultiVaultFacetDeposit is
    MultiVaultHelperFee,
    MultiVaultHelperEverscale,
    MultiVaultHelperReentrancyGuard,
    MultiVaultHelperTokens,
    MultiVaultHelperPendingWithdrawal,
    IMultiVaultFacetDeposit
{
    using SafeERC20 for IERC20;

    /// @notice Transfer tokens to the Everscale. Works both for native and alien tokens.
    /// Approve is required only for alien tokens deposit.
    /// @param recipient Everscale recipient.
    /// @param token EVM token address, should not be blacklisted.
    /// @param amount Amount of tokens to transfer.
    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        address token,
        uint amount
    )
        external
        override
        nonReentrant
        tokenNotBlacklisted(token)
        initializeToken(token)
        onlyEmergencyDisabled
    {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        uint fee = _calculateMovementFee(amount, token, IMultiVaultFacetFees.Fee.Deposit);

        bool isNative = s.tokens_[token].isNative;

        if (isNative) {
            IMultiVaultToken(token).burn(
                msg.sender,
                amount
            );

            _transferToEverscaleNative(token, recipient, amount - fee);
        } else {
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );

            _transferToEverscaleAlien(token, recipient, amount - fee);
        }

        _increaseTokenFee(token, fee);

        emit Deposit(
            isNative ? IMultiVaultFacetTokens.TokenType.Native : IMultiVaultFacetTokens.TokenType.Alien,
            msg.sender,
            token,
            recipient.wid,
            recipient.addr,
            amount,
            fee
        );
    }

    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        address token,
        uint256 amount,
        uint256 expectedMinBounty,
        IMultiVaultFacetPendingWithdrawals.PendingWithdrawalId[] memory pendingWithdrawalIds
    ) external override tokenNotBlacklisted(token) nonReentrant {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        uint amountLeft = amount;
        uint amountPlusBounty = amount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        for (uint i = 0; i < pendingWithdrawalIds.length; i++) {
            IMultiVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId = pendingWithdrawalIds[i];
            IMultiVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

            require(pendingWithdrawal.amount > 0);
            require(pendingWithdrawal.token == token);

            amountLeft -= pendingWithdrawal.amount;
            amountPlusBounty += pendingWithdrawal.bounty;

            s.pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].amount = 0;

            emit PendingWithdrawalFill(
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id
            );

            IERC20(pendingWithdrawal.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount - pendingWithdrawal.bounty
            );
        }

        require(amountPlusBounty - amount >= expectedMinBounty);

        uint fee = _calculateMovementFee(amount, token, IMultiVaultFacetFees.Fee.Deposit);

        _transferToEverscaleAlien(
            token,
            recipient,
            amountPlusBounty - fee
        );

        _increaseTokenFee(token, fee);
    }
}
