// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./IVaultTypes.sol";


interface IVaultEvents is IVaultTypes {
    event Deposit(
        uint256 amount,
        int128 wid,
        uint256 addr
    );

    event NewDeposit(
        address sender,
        int128 recipientWid,
        uint256 recipientAddr,
        uint256 amount,
        address pendingWithdrawalRecipient,
        uint256 pendingWithdrawalId
    );

    event InstantWithdrawal(
        bytes32 payloadId,
        address recipient,
        uint256 amount
    );

    event PendingWithdrawalUpdateBounty(address recipient, uint256 id, uint256 bounty);
    event PendingWithdrawalCancel(address recipient, uint256 id, uint256 amount);
    event PendingWithdrawalCreated(
        address recipient,
        uint256 id,
        uint256 amount,
        bytes32 payloadId
    );
    event PendingWithdrawalWithdraw(
        address recipient,
        uint256 id,
        uint256 requestedAmount,
        uint256 redeemedAmount
    );
    event PendingWithdrawalFill(
        address recipient,
        uint256 id
    );
    event PendingWithdrawalUpdateApproveStatus(
        address recipient,
        uint256 id,
        ApproveStatus approveStatus
    );

    event UpdateBridge(address bridge);
    event UpdateConfiguration(int128 wid, uint256 addr);
    event UpdateTargetDecimals(uint256 targetDecimals);

    event UpdateWithdrawLimitPerPeriod(uint256 withdrawLimitPerPeriod);
    event UpdateUndeclaredWithdrawLimit(uint256 undeclaredWithdrawLimit);
    event UpdateRewards(int128 wid, uint256 addr);
    event UpdateDepositLimit(uint256 depositLimit);

    event UpdatePerformanceFee(uint256 performanceFee);
    event UpdateManagementFee(uint256 managenentFee);
    event UpdateDepositFee(uint256 fee);
    event UpdateWithdrawFee(uint256 fee);

    event UpdateGovernance(address governance);
    event NewPendingGovernance(address governance);
    event UpdateManagement(address management);
    event UpdateWithdrawGuardian(address withdrawGuardian);
    event UpdateGuardian(address guardian);
    event UpdateWithdrawalQueue(address[20] queue);

    event EmergencyShutdown(bool active);

    event StrategyUpdateDebtRatio(address indexed strategy, uint256 debtRatio);
    event StrategyUpdateMinDebtPerHarvest(address indexed strategy, uint256 minDebtPerHarvest);
    event StrategyUpdateMaxDebtPerHarvest(address indexed strategy, uint256 maxDebtPerHarvest);
    event StrategyUpdatePerformanceFee(address indexed strategy, uint256 performanceFee);
    event StrategyMigrated(address indexed oldVersion, address indexed newVersion);
    event StrategyRevoked(address indexed strategy);
    event StrategyRemovedFromQueue(address indexed strategy);
    event StrategyAddedToQueue(address indexed strategy);
    event StrategyReported(
        address indexed strategy,
        uint256 gain,
        uint256 loss,
        uint256 debtPaid,
        uint256 totalGain,
        uint256 totalSkim,
        uint256 totalLoss,
        uint256 totalDebt,
        uint256 debtAdded,
        uint256 debtRatio
    );
    event StrategyAdded(
        address indexed strategy,
        uint256 debtRatio,
        uint256 minDebtPerHarvest,
        uint256 maxDebtPerHarvest,
        uint256 performanceFee
    );
    event StrategyUpdateRewards(
        address strategyId,
        int128 wid,
        uint256 addr
    );
}