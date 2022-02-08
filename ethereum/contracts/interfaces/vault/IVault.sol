// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./IVaultBasic.sol";


interface IVault is IVaultBasic {
    function withdrawGuardian() external view returns (address);
    function management() external view returns (address);

    function pendingWithdrawalsPerUser(address user) external view returns (uint);
    function pendingWithdrawals(
        address user,
        uint id
    ) external view returns (PendingWithdrawalParams memory);
    function pendingWithdrawalsTotal() external view returns (uint);

    function managementFee() external view returns (uint256);
    function performanceFee() external view returns (uint256);

    function strategies(
        address strategyId
    ) external view returns (StrategyParams memory);
    function withdrawalQueue() external view returns (address[20] memory);

    function withdrawLimitPerPeriod() external view returns (uint256);
    function undeclaredWithdrawLimit() external view returns (uint256);
    function withdrawalPeriods(
        uint256 withdrawalPeriodId
    ) external view returns (WithdrawalPeriodParams memory);

    function depositLimit() external view returns (uint256);
    function debtRatio() external view returns (uint256);
    function totalDebt() external view returns (uint256);
    function lastReport() external view returns (uint256);
    function lockedProfit() external view returns (uint256);
    function lockedProfitDegradation() external view returns (uint256);

    function setManagement(address _management) external;
    function setWithdrawGuardian(address _withdrawGuardian) external;
    function setStrategyRewards(
        address strategyId,
        EverscaleAddress memory _rewards
    ) external;
    function setLockedProfitDegradation(uint256 degradation) external;
    function setDepositLimit(uint256 limit) external;
    function setPerformanceFee(uint256 fee) external;
    function setManagementFee(uint256 fee) external;
    function setWithdrawLimitPerPeriod(uint256 _withdrawLimitPerPeriod) external;
    function setUndeclaredWithdrawLimit(uint256 _undeclaredWithdrawLimit) external;
    function setWithdrawalQueue(address[20] memory queue) external;
    function setPendingWithdrawalBounty(uint256 id, uint256 bounty) external;

    function deposit(
        EverscaleAddress memory recipient,
        uint256 amount,
        PendingWithdrawalId memory pendingWithdrawalId
    ) external;

    function deposit(
        EverscaleAddress memory recipient,
        uint256[] memory amount,
        PendingWithdrawalId[] memory pendingWithdrawalId
    ) external;

    function saveWithdrawal(
        bytes memory payload,
        bytes[] memory signatures,
        uint bounty
    ) external;

    function cancelPendingWithdrawal(
        uint256 id,
        uint256 amount,
        EverscaleAddress memory recipient,
        uint bounty
    ) external;

    function withdraw(
        uint256 id,
        uint256 amountRequested,
        address recipient,
        uint256 maxLoss,
        uint bounty
    ) external returns(uint256);

    function addStrategy(
        address strategyId,
        uint256 _debtRatio,
        uint256 minDebtPerHarvest,
        uint256 maxDebtPerHarvest,
        uint256 _performanceFee
    ) external;

    function updateStrategyDebtRatio(
        address strategyId,
        uint256 _debtRatio
    )  external;

    function updateStrategyMinDebtPerHarvest(
        address strategyId,
        uint256 minDebtPerHarvest
    ) external;

    function updateStrategyMaxDebtPerHarvest(
        address strategyId,
        uint256 maxDebtPerHarvest
    ) external;

    function updateStrategyPerformanceFee(
        address strategyId,
        uint256 _performanceFee
    ) external;

    function migrateStrategy(
        address oldVersion,
        address newVersion
    ) external;

    function revokeStrategy(
        address strategyId
    ) external;
    function revokeStrategy() external;

    function debtOutstanding(address strategyId) external view returns (uint256);
    function debtOutstanding() external view returns (uint256);

    function creditAvailable(address strategyId) external view returns (uint256);
    function creditAvailable() external view returns (uint256);

    function availableDepositLimit() external view returns (uint256);
    function expectedReturn(address strategyId) external view returns (uint256);

    function report(
        uint256 profit,
        uint256 loss,
        uint256 _debtPayment
    ) external returns (uint256);

    function skim(address strategyId) external;

    function forceWithdraw(
        PendingWithdrawalId memory pendingWithdrawalId
    ) external;

    function forceWithdraw(
        PendingWithdrawalId[] memory pendingWithdrawalId
    ) external;

    function setPendingWithdrawalApprove(
        PendingWithdrawalId memory pendingWithdrawalId,
        ApproveStatus approveStatus
    ) external;

    function setPendingWithdrawalApprove(
        PendingWithdrawalId[] memory pendingWithdrawalId,
        ApproveStatus[] memory approveStatus
    ) external;
}