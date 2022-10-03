// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../../interfaces/IEverscale.sol";
import "./../../interfaces/vault/IVaultFacetWithdraw.sol";
import "./../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";
import "./../../interfaces/vault/IVaultFacetWithdrawEvents.sol";
import "./../../interfaces/IBridge.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../helpers/VaultHelperEmergency.sol";
import "../helpers/VaultHelperWithdraw.sol";
import "../helpers/VaultHelperPendingWithdrawals.sol";
import "../helpers/VaultHelperTokenBalance.sol";
import "../helpers/VaultHelperStrategies.sol";
import "../helpers/VaultHelperRoles.sol";
import "../helpers/VaultHelperFee.sol";
import "../helpers/VaultHelperWithdrawPeriods.sol";

import "../storage/VaultStorageVault.sol";


contract VaultFacetWithdraw is
    VaultHelperEmergency,
    VaultHelperWithdraw,
    VaultHelperPendingWithdrawals,
    VaultHelperRoles,
    VaultHelperTokenBalance,
    VaultHelperFee,
    VaultHelperStrategies,
    VaultHelperWithdrawPeriods,
    IVaultFacetWithdraw,
    IVaultFacetWithdrawEvents
{
    using SafeERC20 for IERC20;

    /**
        @notice Save withdrawal receipt. If Vault has enough tokens and withdrawal passes the
            limits, then it's executed immediately. Otherwise it's saved as a pending withdrawal.
        @param payload Withdrawal receipt. Bytes encoded `struct EverscaleEvent`.
        @param signatures List of relay's signatures. See not on `Bridge.verifySignedEverscaleEvent`.
        @return instantWithdrawal Boolean, was withdrawal instantly filled or saved as a pending withdrawal.
        @return pendingWithdrawalId Pending withdrawal ID. `(address(0), 0)` if no pending withdrawal was created.
    */
    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures
    )
        public
        override
        onlyEmergencyDisabled
        withdrawalNotSeenBefore(payload)
    returns (
        bool instantWithdrawal,
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
    ) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(
            IBridge(s.bridge).verifySignedEverscaleEvent(payload, signatures) == 0,
            "Vault: signatures verification failed"
        );

        // Decode Everscale event
        (IEverscale.EverscaleEvent memory _event) = abi.decode(payload, (IEverscale.EverscaleEvent));

        require(
            _event.configurationWid == s.configuration_.wid &&
            _event.configurationAddress == s.configuration_.addr
        );

        bytes32 payloadId = keccak256(payload);

        // Decode event data
        WithdrawalParams memory withdrawal = decodeWithdrawalEventData(_event.eventData);

        require(withdrawal.chainId == _getChainID());

        // Ensure withdrawal fee
        uint256 fee = _calculateMovementFee(withdrawal.amount, s.withdrawFee);

        if (fee > 0) s.fees += fee;

        // Consider withdrawal period limit
        IVaultFacetPendingWithdrawals.WithdrawalPeriodParams memory withdrawalPeriod = _withdrawalPeriod(_event.eventTimestamp);
        _withdrawalPeriodIncreaseTotalByTimestamp(_event.eventTimestamp, withdrawal.amount);

        bool withdrawalLimitsPassed = _withdrawalPeriodCheckLimitsPassed(withdrawal.amount, withdrawalPeriod);

        // Withdrawal is less than limits and Vault's token balance is enough for instant withdrawal
        if (withdrawal.amount <= _vaultTokenBalance() && withdrawalLimitsPassed) {
            IERC20(s.token).safeTransfer(withdrawal.recipient, withdrawal.amount - fee);

            emit InstantWithdrawal(payloadId, withdrawal.recipient, withdrawal.amount - fee);

            return (true, IVaultFacetPendingWithdrawals.PendingWithdrawalId(address(0), 0));
        }

        // Save withdrawal as a pending
        uint256 id = _pendingWithdrawalCreate(
            withdrawal.recipient,
            withdrawal.amount - fee,
            _event.eventTimestamp
        );

        emit PendingWithdrawalCreated(withdrawal.recipient, id, withdrawal.amount - fee, payloadId);

        pendingWithdrawalId = IVaultFacetPendingWithdrawals.PendingWithdrawalId(withdrawal.recipient, id);

        if (!withdrawalLimitsPassed) {
            _pendingWithdrawalApproveStatusUpdate(
                pendingWithdrawalId,
                IVaultFacetPendingWithdrawals.ApproveStatus.Required
            );
        }

        return (false, pendingWithdrawalId);
    }

    /**
        @notice Save withdrawal receipt, same as `saveWithdraw(bytes payload, bytes[] signatures)`,
            but allows to immediately set up bounty.
        @param payload Withdrawal receipt. Bytes encoded `struct EverscaleEvent`.
        @param signatures List of relay's signatures. See not on `Bridge.verifySignedEverscaleEvent`.
        @param bounty New value for pending withdrawal bounty.
    */
    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures,
        uint bounty
    )
        external
        override
    {
        (
            bool instantWithdraw,
            IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
        ) = saveWithdraw(payload, signatures);

        if (!instantWithdraw && msg.sender == pendingWithdrawalId.recipient) {
            IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);
            require(bounty <= pendingWithdrawal.amount);

            _pendingWithdrawalBountyUpdate(pendingWithdrawalId, bounty);
        }
    }

    /**
        @notice Withdraws the calling account's pending withdrawal from this Vault.
        @param id Pending withdrawal ID.
        @param amountRequested Amount of tokens to be withdrawn.
        @param recipient The address to send the redeemed tokens.
        @param maxLoss The maximum acceptable loss to sustain on withdrawal.
            If a loss is specified, up to that amount of tokens may be burnt to cover losses on withdrawal.
        @param bounty New value for bounty.
        @return amountAdjusted The quantity of tokens redeemed.
    */
    function withdraw(
        uint256 id,
        uint256 amountRequested,
        address recipient,
        uint256 maxLoss,
        uint256 bounty
    )
        external
        override
        onlyEmergencyDisabled
        pendingWithdrawalOpened(IVaultFacetPendingWithdrawals.PendingWithdrawalId(msg.sender, id))
        pendingWithdrawalApproved(IVaultFacetPendingWithdrawals.PendingWithdrawalId(msg.sender, id))
        returns(uint256 amountAdjusted)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId = IVaultFacetPendingWithdrawals
            .PendingWithdrawalId(msg.sender, id);
        IVaultFacetPendingWithdrawals.PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(
            amountRequested > 0 &&
            amountRequested <= pendingWithdrawal.amount &&
            bounty <= pendingWithdrawal.amount - amountRequested
        );

        _pendingWithdrawalBountyUpdate(pendingWithdrawalId, bounty);

        amountAdjusted = amountRequested;

        if (amountAdjusted > _vaultTokenBalance()) {
            uint256 totalLoss = 0;

            for (uint i = 0; i < s.withdrawalQueue_.length; i++) {
                address strategyId = s.withdrawalQueue_[i];

                // We're done withdrawing
                if (strategyId == address(0)) break;

                uint256 vaultBalance = _vaultTokenBalance();
                uint256 amountNeeded = amountAdjusted - vaultBalance;

                // Don't withdraw more than the debt so that Strategy can still
                // continue to work based on the profits it has
                // This means that user will lose out on any profits that each
                // Strategy in the queue would return on next harvest, benefiting others
                amountNeeded = Math.min(
                    amountNeeded,
                    _strategy(strategyId).totalDebt
                );

                // Nothing to withdraw from this Strategy, try the next one
                if (amountNeeded == 0) continue;

                // Force withdraw value from each Strategy in the order set by governance
                uint256 loss = IStrategy(strategyId).withdraw(amountNeeded);
                uint256 withdrawn = _vaultTokenBalance() - vaultBalance;

                // Withdrawer incurs any losses from liquidation
                if (loss > 0) {
                    // TODO: fix stack too deep
//                    amountAdjusted -= loss;
//                    totalLoss += loss;
//                    _strategyReportLoss(strategyId, loss);
                }

                // Reduce the Strategy's debt by the value withdrawn ("realized returns")
                // This doesn't add to returns as it's not earned by "normal means"
                _strategyTotalDebtReduce(strategyId, withdrawn);
            }

            require(_vaultTokenBalance() >= amountAdjusted);

            // This loss protection is put in place to revert if losses from
            // withdrawing are more than what is considered acceptable.
            require(totalLoss <= maxLoss * (amountAdjusted + totalLoss) / VaultStorageVault.MAX_BPS);
        }

        IERC20(s.token).safeTransfer(recipient, amountAdjusted);

        _pendingWithdrawalAmountReduce(pendingWithdrawalId, amountRequested);

        emit PendingWithdrawalWithdraw(
            pendingWithdrawalId.recipient,
            pendingWithdrawalId.id,
            amountRequested,
            amountAdjusted
        );

        return amountAdjusted;
    }
    /**
        @notice Set withdraw fee. Must be less than `MAX_BPS`.
        This may be called only by `governance` or `management`
        @param _withdrawFee Withdraw fee, must be less than `MAX_BPS / 2`.
    */
    function setWithdrawFee(
        uint _withdrawFee
    ) external override onlyGovernanceOrManagement {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(_withdrawFee <= VaultStorageVault.MAX_BPS / 2);

        s.withdrawFee = _withdrawFee;

        emit UpdateWithdrawFee(s.withdrawFee);
    }

    function withdrawalIds(bytes32 id) external view override returns (bool) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawalIds[id];
    }

    function withdrawFee() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawFee;
    }

    function decodeWithdrawalEventData(
        bytes memory eventData
    ) public override view returns(IVaultFacetWithdraw.WithdrawalParams memory) {
        (
            int8 sender_wid,
            uint256 sender_addr,
            uint128 amount,
            uint160 recipient,
            uint32 chainId
        ) = abi.decode(
            eventData,
            (int8, uint256, uint128, uint160, uint32)
        );

        return IVaultFacetWithdraw.WithdrawalParams({
            sender: IEverscale.EverscaleAddress(sender_wid, sender_addr),
            amount: convertFromTargetDecimals(amount),
            recipient: address(recipient),
            chainId: chainId
        });
    }
}
