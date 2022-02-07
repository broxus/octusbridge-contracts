// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./IVaultEvents.sol";


interface IVault is IVaultEvents {
    function bridge() external view returns (address);
//    function configuration() external view returns (EverscaleAddress memory);
//    function withdrawalIds(bytes32) external view returns (bool);
//    function rewards() external view returns (EverscaleAddress memory);

//    function pendingWithdrawalsPerUser(address user) external view returns (uint);
//    function pendingWithdrawals(
//        address user,
//        uint id
//    ) external view returns (PendingWithdrawalParams memory);
//    function pendingWithdrawalsTotal() external view return (uint);

    function governance() external view returns (address);
    function guardian() external view returns (address);
    function withdrawGuardian() external view returns (address);
    function management() external view returns (address);

    function token() external view returns (address);
    function targetDecimals() external view returns (uint256);
    function tokenDecimals() external view returns (uint256);

    function depositFee() external view returns (uint256);
    function withdrawFee() external view returns (uint256);
    function managementFee() external view returns (uint256);
    function performanceFee() external view returns (uint256);

    function strategies(
        address strategyId
    ) external view returns (StrategyParams memory);
//    function withdrawalQueue() external view returns (address[20] memory);

//    function emergencyShutdown() external view returns (bool);
//    function withdrawLimitPerPeriod() external view returns (uint256);
//    function undeclaredWithdrawLimit() external view returns (uint256);
//    function withdrawalPeriod(
//        uint256 withdrawalPeriodId
//    ) external view returns (WithdrawalPeriodParams memory);

//    function depositLimit() external view returns (uint256);
//    function debtRatio() external view returns (uint256);
//    function totalDebt() external view returns (uint256);
//    function lastReport() external view returns (uint256);
//    function lockedProfit() external view returns (uint256);
//    function lockedProfitDegradation() external view returns (uint256);

    function initialize(
        address _bridge,
        address _governance,
        address _token,
        uint _targetDecimals
    ) external;

    function apiVersion() external view returns (string memory api_version);

    function setDepositFee(uint _depositFee) external;
    function setWithdrawFee(uint _withdrawFee) external;

    function setConfiguration(EverscaleAddress memory _configuration) external;
    function setGovernance(address _governance) external;
    function acceptGovernance() external;
    function setManagement(address _management) external;
    function setGuardian(address _guardian) external;
    function setWithdrawGuardian(address _withdrawGuardian) external;
    function setStrategyRewards(
        address strategyId,
        EverscaleAddress memory _rewards
    ) external;
    function setRewards(EverscaleAddress memory _rewards) external;
    function setLockedProfitDegradation(uint256 degradation) external;
    function setDepositLimit(uint256 limit) external;
    function setPerformanceFee(uint256 fee) external;
    function setManagementFee(uint256 fee) external;
    function setWithdrawLimitPerPeriod(uint256 _withdrawLimitPerPeriod) external;
    function setUndeclaredWithdrawLimit(uint256 _undeclaredWithdrawLimit) external;
    function setEmergencyShutdown(bool active) external;
    function setWithdrawalQueue(address[20] memory queue) external;
    function setPendingWithdrawalBounty(uint256 id, uint256 bounty) external;
    function totalAssets() external view returns (uint256);

    function deposit(
        EverscaleAddress memory recipient,
        uint256 amount
    ) external;

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
        uint256 _bounty
    ) external;

    function cancelPendingWithdrawal(
        uint256 id,
        uint256 amount,
        EverscaleAddress memory recipient
    ) external;

    function withdraw(
        uint256 id,
        uint256 amountRequested,
        address recipient,
        uint256 maxLoss
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
    function sweep(address _token) external;

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