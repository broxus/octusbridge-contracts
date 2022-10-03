// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../../interfaces/vault/IVaultFacetStrategies.sol";
import "../../interfaces/vault/IVaultFacetStrategiesEvents.sol";
import "../../interfaces/IEverscale.sol";

import "../helpers/VaultHelperRoles.sol";
import "../helpers/VaultHelperEmergency.sol";
import "../helpers/VaultHelperStrategies.sol";
import "../helpers/VaultHelperEverscale.sol";

import "../storage/VaultStorageVault.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract VaultFacetStrategies is
    VaultHelperRoles,
    VaultHelperEmergency,
    VaultHelperStrategies,
    VaultHelperEverscale,
    IVaultFacetStrategies,
    IVaultFacetStrategiesEvents
{
    using SafeERC20 for IERC20;

    function strategies(
        address strategyId
    ) external view override returns (StrategyParams memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.strategies_[strategyId];
    }

    function withdrawalQueue() external view override returns (address[20] memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawalQueue_;
    }

    /// @notice Changes the locked profit degradation
    /// This may be called only by `governance`
    /// @param degradation The rate of degradation in percent per second scaled to 1e18
    function setLockedProfitDegradation(
        uint256 degradation
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(degradation <= VaultStorageVault.DEGRADATION_COEFFICIENT);

        s.lockedProfitDegradation = degradation;
    }
    /// @notice Changes `withdrawalQueue`
    /// This may only be called by `governance`
    function setWithdrawalQueue(
        address[20] memory queue
    ) external override onlyGovernanceOrManagement {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.withdrawalQueue_ = queue;

        emit UpdateWithdrawalQueue(s.withdrawalQueue_);
    }
    function _assessFees(
        address strategyId,
        uint256 gain
    ) internal returns (uint256) {
        StrategyParams memory strategy = _strategy(strategyId);

        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        // Just added, no fees to assess
        if (strategy.activation == block.timestamp) return 0;

        uint256 duration = block.timestamp - strategy.lastReport;
        require(duration > 0); // Can't call twice within the same block

        if (gain == 0) return 0; // The fees are not charged if there hasn't been any gains reported

        uint256 management_fee = (
            strategy.totalDebt - IStrategy(strategyId).delegatedAssets()
        ) * duration * s.managementFee / VaultStorageVault.MAX_BPS / VaultStorageVault.SECS_PER_YEAR;

        uint256 strategist_fee = (gain * strategy.performanceFee) / VaultStorageVault.MAX_BPS;

        uint256 performance_fee = (gain * s.performanceFee) / VaultStorageVault.MAX_BPS;

        uint256 total_fee = management_fee + strategist_fee + performance_fee;

        // Fee
        if (total_fee > gain) {
            strategist_fee = strategist_fee * gain / total_fee;
            performance_fee = performance_fee * gain / total_fee;
            management_fee = management_fee * gain / total_fee;

            total_fee = gain;
        }

        if (strategist_fee > 0) { // Strategy rewards are paid instantly
            _transferToEverscale(strategy.rewards, strategist_fee);
        }

        if (performance_fee + management_fee > 0) {
            s.fees += performance_fee + management_fee;
        }

        return total_fee;
    }

    /**
        @notice Add a Strategy to the Vault
        This may only be called by `governance`
        @param strategyId The address of the Strategy to add.
        @param _debtRatio The share of the total assets in the `vault that the `strategy` has access to.
        @param minDebtPerHarvest Lower limit on the increase of debt since last harvest.
        @param maxDebtPerHarvest Upper limit on the increase of debt since last harvest.
        @param _performanceFee The fee the strategist will receive based on this Vault's performance.
    */
    function addStrategy(
        address strategyId,
        uint256 _debtRatio,
        uint256 minDebtPerHarvest,
        uint256 maxDebtPerHarvest,
        uint256 _performanceFee
    )
        external
        override
        onlyGovernance
        onlyEmergencyDisabled
        strategyNotExists(strategyId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(strategyId != address(0));

        require(IStrategy(strategyId).vault() == address(this));
        require(IStrategy(strategyId).want() == s.token);

        require(s.debtRatio + _debtRatio <= VaultStorageVault.MAX_BPS);
        require(minDebtPerHarvest <= maxDebtPerHarvest);
        require(_performanceFee <= VaultStorageVault.MAX_BPS / 2);

        _strategyCreate(strategyId, StrategyParams({
            performanceFee: _performanceFee,
            activation: block.timestamp,
            debtRatio: _debtRatio,
            minDebtPerHarvest: minDebtPerHarvest,
            maxDebtPerHarvest: maxDebtPerHarvest,
            lastReport: block.timestamp,
            totalDebt: 0,
            totalGain: 0,
            totalSkim: 0,
            totalLoss: 0,
            rewardsManager: address(0),
            rewards: s.rewards_
        }));

        emit StrategyAdded(
            strategyId,
            _debtRatio,
            minDebtPerHarvest,
            maxDebtPerHarvest,
            _performanceFee
        );

        _debtRatioIncrease(_debtRatio);
    }

    /**
        @notice Change the quantity of assets `strategy` may manage.
        This may be called by `governance` or `management`.
        @param strategyId The Strategy to update.
        @param _debtRatio The quantity of assets `strategy` may now manage.
    */
    function updateStrategyDebtRatio(
        address strategyId,
        uint256 _debtRatio
    )
        external
        override
        onlyGovernanceOrManagement
        strategyExists(strategyId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();
        StrategyParams memory strategy = _strategy(strategyId);

        _debtRatioReduce(strategy.debtRatio);
        _strategyDebtRatioUpdate(strategyId, _debtRatio);
        _debtRatioIncrease(_debtRatio);

        require(s.debtRatio <= VaultStorageVault.MAX_BPS);

        emit StrategyUpdateDebtRatio(strategyId, _debtRatio);
    }

    function updateStrategyMinDebtPerHarvest(
        address strategyId,
        uint256 minDebtPerHarvest
    )
        external
        override
        onlyGovernanceOrManagement
        strategyExists(strategyId)
    {
        StrategyParams memory strategy = _strategy(strategyId);

        require(strategy.maxDebtPerHarvest >= minDebtPerHarvest);

        _strategyMinDebtPerHarvestUpdate(strategyId, minDebtPerHarvest);

        emit StrategyUpdateMinDebtPerHarvest(strategyId, minDebtPerHarvest);
    }

    function updateStrategyMaxDebtPerHarvest(
        address strategyId,
        uint256 maxDebtPerHarvest
    )
        external
        override
        onlyGovernanceOrManagement
        strategyExists(strategyId)
    {
        StrategyParams memory strategy = _strategy(strategyId);

        require(strategy.minDebtPerHarvest <= maxDebtPerHarvest);

        _strategyMaxDebtPerHarvestUpdate(strategyId, maxDebtPerHarvest);

        emit StrategyUpdateMaxDebtPerHarvest(strategyId, maxDebtPerHarvest);
    }

    function updateStrategyPerformanceFee(
        address strategyId,
        uint256 _performanceFee
    )
        external
        override
        onlyGovernance
        strategyExists(strategyId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(_performanceFee <= VaultStorageVault.MAX_BPS / 2);

        s.performanceFee = _performanceFee;

        emit StrategyUpdatePerformanceFee(strategyId, _performanceFee);
    }

    /**
        @notice Reports the amount of assets the calling Strategy has free (usually in
            terms of ROI).

            The performance fee is determined here, off of the strategy's profits
            (if any), and sent to governance.

            The strategist's fee is also determined here (off of profits), to be
            handled according to the strategist on the next harvest.

            This may only be called by a Strategy managed by this Vault.
        @dev For approved strategies, this is the most efficient behavior.
            The Strategy reports back what it has free, then Vault "decides"
            whether to take some back or give it more. Note that the most it can
            take is `gain + _debtPayment`, and the most it can give is all of the
            remaining reserves. Anything outside of those bounds is abnormal behavior.

            All approved strategies must have increased diligence around
            calling this function, as abnormal behavior could become catastrophic.
        @param gain Amount Strategy has realized as a gain on it's investment since its
            last report, and is free to be given back to Vault as earnings
        @param loss Amount Strategy has realized as a loss on it's investment since its
            last report, and should be accounted for on the Vault's balance sheet.
            The loss will reduce the debtRatio. The next time the strategy will harvest,
            it will pay back the debt in an attempt to adjust to the new debt limit.
        @param _debtPayment Amount Strategy has made available to cover outstanding debt
        @return Amount of debt outstanding (if totalDebt > debtLimit or emergency shutdown).
    */
    function report(
        uint256 gain,
        uint256 loss,
        uint256 _debtPayment
    )
        external
        override
        strategyExists(msg.sender)
        returns (uint256)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        if (loss > 0) _strategyReportLoss(msg.sender, loss);

        uint256 totalFees = _assessFees(msg.sender, gain);

        _strategyTotalGainIncrease(msg.sender, gain);

        // Compute the line of credit the Vault is able to offer the Strategy (if any)
        uint256 credit = _strategyCreditAvailable(msg.sender);

        // Outstanding debt the Strategy wants to take back from the Vault (if any)
        // debtOutstanding <= strategy.totalDebt
        uint256 debt = _strategyDebtOutstanding(msg.sender);
        uint256 debtPayment = Math.min(_debtPayment, debt);

        if (debtPayment > 0) {
            _strategyTotalDebtReduce(msg.sender, debtPayment);

            debt -= debtPayment;
        }

        // Update the actual debt based on the full credit we are extending to the Strategy
        // or the returns if we are taking funds back
        // NOTE: credit + self.strategies_[msg.sender].totalDebt is always < self.debtLimit
        // NOTE: At least one of `credit` or `debt` is always 0 (both can be 0)
        if (credit > 0) {
            _strategyTotalDebtIncrease(msg.sender, credit);
        }

        // Give/take balance to Strategy, based on the difference between the reported gains
        // (if any), the debt payment (if any), the credit increase we are offering (if any),
        // and the debt needed to be paid off (if any)
        // NOTE: This is just used to adjust the balance of tokens between the Strategy and
        //       the Vault based on the Strategy's debt limit (as well as the Vault's).
        uint256 totalAvailable = gain + debtPayment;

        if (totalAvailable < credit) { // credit surplus, give to Strategy
            IERC20(s.token).safeTransfer(msg.sender, credit - totalAvailable);
        } else if (totalAvailable > credit) { // credit deficit, take from Strategy
            IERC20(s.token).safeTransferFrom(msg.sender, address(this), totalAvailable - credit);
        } else {
            // don't do anything because it is balanced
        }

        // Profit is locked and gradually released per block
        // NOTE: compute current locked profit and replace with sum of current and new
        uint256 lockedProfitBeforeLoss = _calculateLockedProfit() + gain - totalFees;

        if (lockedProfitBeforeLoss > loss) {
            s.lockedProfit = lockedProfitBeforeLoss - loss;
        } else {
            s.lockedProfit = 0;
        }

        _strategyLastReportUpdate(msg.sender);

        StrategyParams memory strategy = _strategy(msg.sender);

        // TODO: fix stack problem
//        emit StrategyReported(
//            msg.sender,
//            gain,
//            loss,
//            debtPayment,
//            strategy.totalGain,
//            strategy.totalSkim,
//            strategy.totalLoss,
//            strategy.totalDebt,
//            credit,
//            strategy.debtRatio
//        );

        if (strategy.debtRatio == 0 || s.emergencyShutdown) {
            // Take every last penny the Strategy has (Emergency Exit/revokeStrategy)
            // NOTE: This is different than `debt` in order to extract *all* of the returns
            return IStrategy(msg.sender).estimatedTotalAssets();
        } else {
            return debt;
        }
    }

    /// @notice Set strategy rewards_ recipient address.
    /// This may only be called by the `governance` or strategy rewards_ manager.
    /// @param strategyId Strategy address.
    /// @param _rewards Rewards recipient.
    function setStrategyRewards(
        address strategyId,
        IEverscale.EverscaleAddress memory _rewards
    )
        external
        override
        onlyGovernanceOrStrategyRewardsManager(strategyId)
        strategyExists(strategyId)
    {
        _strategyRewardsUpdate(strategyId, _rewards);

        emit StrategyUpdateRewards(strategyId, _rewards.wid, _rewards.addr);
    }

    /**
        @notice Skim strategy gain to the `rewards_` address.
        This may only be called by `governance` or `management`
        @param strategyId Strategy address to skim.
    */
    function skim(
        address strategyId
    )
        external
        override
        onlyGovernanceOrManagement
        strategyExists(strategyId)
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint amount = s.strategies_[strategyId].totalGain - s.strategies_[strategyId].totalSkim;

        require(amount > 0);

        s.strategies_[strategyId].totalSkim += amount;

        _transferToEverscale(s.rewards_, amount);
    }

    function expectedReturn(
        address strategyId
    )
        external
        override
        view
        returns (uint256)
    {
        return _strategyExpectedReturn(strategyId);
    }


    function revokeStrategy(
        address strategyId
    )
        external
        override
        onlyStrategyOrGovernanceOrGuardian(strategyId)
    {
        _strategyRevoke(strategyId);

        emit StrategyRevoked(strategyId);
    }

    function revokeStrategy()
        external
        override
        onlyStrategyOrGovernanceOrGuardian(msg.sender)
    {
        _strategyRevoke(msg.sender);

        emit StrategyRevoked(msg.sender);
    }

    function debtOutstanding(
        address strategyId
    )
        external
        view
        override
        returns (uint256)
    {
        return _strategyDebtOutstanding(strategyId);
    }

    function debtOutstanding()
        external
        view
        override
        returns (uint256)
    {
        return _strategyDebtOutstanding(msg.sender);
    }

    function creditAvailable(
        address strategyId
    )
        external
        view
        override
        returns (uint256)
    {
        return _strategyCreditAvailable(strategyId);
    }

    function creditAvailable()
        external
        view
        override
        returns (uint256)
    {
        return _strategyCreditAvailable(msg.sender);
    }

    function totalDebt() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.totalDebt;
    }

    function lockedProfitDegradation() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.lockedProfitDegradation;
    }

    function lockedProfit() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.lockedProfit;
    }

    function lastReport() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.lastReport;
    }

    function debtRatio() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.debtRatio;
    }
}
