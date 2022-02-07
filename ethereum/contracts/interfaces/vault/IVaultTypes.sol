// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.2;


import "../IEverscale.sol";


interface IVaultTypes is IEverscale {
    enum ApproveStatus { NotRequired, Required, Approved, Rejected }

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
        EverscaleAddress rewards;
    }

    struct PendingWithdrawalParams {
        uint256 amount;
        uint256 bounty;
        uint256 timestamp;
        ApproveStatus approveStatus;
    }

    struct PendingWithdrawalId {
        address recipient;
        uint256 id;
    }

    struct WithdrawalPeriodParams {
        uint256 total;
        uint256 considered;
    }
}