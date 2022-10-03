// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";
import "../../interfaces/IEverscale.sol";
import "../../interfaces/IStrategy.sol";
import "../../interfaces/vault/IVaultFacetStrategies.sol";
import "./VaultHelperTokenBalance.sol";
import "./../../libraries/Math.sol";


abstract contract VaultHelperStrategies is VaultHelperTokenBalance {
    modifier strategyNotExists(address strategyId) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);

        require(strategy.activation == 0, "Vault: strategy exists");

        _;
    }

    modifier strategyExists(address strategyId) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);

        require(strategy.activation > 0, "Vault: strategy not exists");

        _;
    }

    function _debtRatioReduce(
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.debtRatio -= amount;
    }

    function _debtRatioIncrease(
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.debtRatio += amount;
    }

    function _strategy(
        address strategyId
    ) internal view returns (IVaultFacetStrategies.StrategyParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.strategies_[strategyId];
    }

    function _strategyCreate(
        address strategyId,
        IVaultFacetStrategies.StrategyParams memory strategyParams
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId] = strategyParams;
    }

    function _strategyRewardsUpdate(
        address strategyId,
        IEverscale.EverscaleAddress memory _rewards
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].rewards = _rewards;
    }

    function _strategyDebtRatioUpdate(
        address strategyId,
        uint256 debtRatio
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].debtRatio = debtRatio;
    }

    function _strategyLastReportUpdate(
        address strategyId
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].lastReport = block.timestamp;
        s.lastReport = block.timestamp;
    }

    function _strategyTotalDebtReduce(
        address strategyId,
        uint256 debtPayment
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].totalDebt -= debtPayment;
        s.totalDebt -= debtPayment;
    }

    function _strategyTotalDebtIncrease(
        address strategyId,
        uint256 credit
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].totalDebt += credit;
        s.totalDebt += credit;
    }

    function _strategyDebtOutstanding(
        address strategyId
    ) internal view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);

        if (s.debtRatio == 0) return strategy.totalDebt;

        uint256 strategy_debtLimit = strategy.debtRatio * _totalAssets() / VaultStorageVault.MAX_BPS;

        if (s.emergencyShutdown) {
            return strategy.totalDebt;
        } else if (strategy.totalDebt <= strategy_debtLimit) {
            return 0;
        } else {
            return strategy.totalDebt - strategy_debtLimit;
        }
    }

    function _strategyCreditAvailable(
        address strategyId
    ) internal view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        if (s.emergencyShutdown) return 0;

        uint256 vault_totalAssets = _totalAssets();

        // Cant extend Strategies debt until total amount of pending withdrawals is more than Vault's total assets
        if (s.pendingWithdrawalsTotal >= vault_totalAssets) return 0;

        uint256 vault_debtLimit = s.debtRatio * vault_totalAssets / VaultStorageVault.MAX_BPS;
        uint256 vault_totalDebt = s.totalDebt;

        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);

        uint256 strategy_debtLimit = strategy.debtRatio * vault_totalAssets / VaultStorageVault.MAX_BPS;

        // Exhausted credit line
        if (strategy_debtLimit <= strategy.totalDebt || vault_debtLimit <= vault_totalDebt) return 0;

        // Start with debt limit left for the Strategy
        uint256 available = strategy_debtLimit - strategy.totalDebt;

        // Adjust by the global debt limit left
        available = Math.min(available, vault_debtLimit - vault_totalDebt);

        // Can only borrow up to what the contract has in reserve
        // NOTE: Running near 100% is discouraged
        available = Math.min(available, _vaultTokenBalance());

        // Adjust by min and max borrow limits (per harvest)
        // NOTE: min increase can be used to ensure that if a strategy has a minimum
        //       amount of capital needed to purchase a position, it's not given capital
        //       it can't make use of yet.
        // NOTE: max increase is used to make sure each harvest isn't bigger than what
        //       is authorized. This combined with adjusting min and max periods in
        //       `BaseStrategy` can be used to effect a "rate limit" on capital increase.
        if (available < strategy.minDebtPerHarvest) {
            return 0;
        } else {
            return Math.min(available, strategy.maxDebtPerHarvest);
        }
    }

    function _strategyTotalGainIncrease(
        address strategyId,
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].totalGain += amount;
    }

    function _strategyExpectedReturn(
        address strategyId
    ) internal view returns (uint256) {
        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);

        uint256 timeSinceLastHarvest = block.timestamp - strategy.lastReport;
        uint256 totalHarvestTime = strategy.lastReport - strategy.activation;

        if (timeSinceLastHarvest > 0 && totalHarvestTime > 0 && IStrategy(strategyId).isActive()) {
            return strategy.totalGain * timeSinceLastHarvest / totalHarvestTime;
        } else {
            return 0;
        }
    }

    function _strategyDebtRatioReduce(
        address strategyId,
        uint256 amount
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].debtRatio -= amount;
        s.debtRatio -= amount;
    }

    function _strategyRevoke(
        address strategyId
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        _strategyDebtRatioReduce(strategyId, s.strategies_[strategyId].debtRatio);
    }

    function _strategyMinDebtPerHarvestUpdate(
        address strategyId,
        uint256 minDebtPerHarvest
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].minDebtPerHarvest = minDebtPerHarvest;
    }

    function _strategyMaxDebtPerHarvestUpdate(
        address strategyId,
        uint256 maxDebtPerHarvest
    ) internal {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.strategies_[strategyId].maxDebtPerHarvest = maxDebtPerHarvest;
    }

    function _strategyReportLoss(
        address strategyId,
        uint256 loss
    ) internal {
        IVaultFacetStrategies.StrategyParams memory strategy = _strategy(strategyId);
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint256 totalDebt = strategy.totalDebt;

        // Loss can only be up the amount of debt issued to strategy
        require(loss <= totalDebt);

        // Also, make sure we reduce our trust with the strategy by the amount of loss
        if (s.debtRatio != 0) { // if vault with single strategy that is set to EmergencyOne
            // NOTE: The context to this calculation is different than the calculation in `_reportLoss`,
            // this calculation intentionally approximates via `totalDebt` to avoid manipulable results
            // NOTE: This calculation isn't 100% precise, the adjustment is ~10%-20% more severe due to EVM math
            uint256 ratio_change = Math.min(
                loss * s.debtRatio / totalDebt,
                strategy.debtRatio
            );

            _strategyDebtRatioReduce(strategyId, ratio_change);
        }

        // Finally, adjust our strategy's parameters by the loss
        s.strategies_[strategyId].totalLoss += loss;

        _strategyTotalDebtReduce(strategyId, loss);
    }

    function _calculateLockedProfit() internal view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint256 lockedFundsRatio = (block.timestamp - s.lastReport) * s.lockedProfitDegradation;

        if (lockedFundsRatio < VaultStorageVault.DEGRADATION_COEFFICIENT) {
            uint256 _lockedProfit = s.lockedProfit;

            return _lockedProfit - (lockedFundsRatio * _lockedProfit / VaultStorageVault.DEGRADATION_COEFFICIENT);
        } else {
            return 0;
        }
    }
}
