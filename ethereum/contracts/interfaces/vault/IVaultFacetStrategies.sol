// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../IEverscale.sol";


interface IVaultFacetStrategies {
    struct StrategyParams {
        uint256 performanceFee;
        uint256 activation;
        uint256 debtRatio;
        uint256 minDebtPerHarvest;
        uint256 maxDebtPerHarvest;
        uint256 lastReport;
        uint256 totalDebt;
        uint256 totalGain;
        uint256 totalSkim;
        uint256 totalLoss;
        address rewardsManager;
        IEverscale.EverscaleAddress rewards;
    }

    function strategies(
        address strategyId
    ) external view returns (StrategyParams memory);
    function withdrawalQueue() external view returns (address[20] memory);

    function debtRatio() external view returns (uint256);
    function totalDebt() external view returns (uint256);
    function lastReport() external view returns (uint256);
    function lockedProfit() external view returns (uint256);
    function lockedProfitDegradation() external view returns (uint256);

    function setStrategyRewards(
        address strategyId,
        IEverscale.EverscaleAddress memory _rewards
    ) external;

    function setLockedProfitDegradation(uint256 degradation) external;
    function setWithdrawalQueue(address[20] memory queue) external;

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

    function revokeStrategy(
        address strategyId
    ) external;
    function revokeStrategy() external;

    function debtOutstanding(address strategyId) external view returns (uint256);
    function debtOutstanding() external view returns (uint256);

    function creditAvailable(address strategyId) external view returns (uint256);
    function creditAvailable() external view returns (uint256);

    function expectedReturn(address strategyId) external view returns (uint256);

    function report(
        uint256 profit,
        uint256 loss,
        uint256 _debtPayment
    ) external returns (uint256);

    function skim(address strategyId) external;
}
