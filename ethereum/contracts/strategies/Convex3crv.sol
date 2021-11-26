/**
 *Submitted for verification at Etherscan.io on 2021-05-30
*/

// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;


import "../interfaces/IBooster.sol";
import "../interfaces/ICurveFi.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/IRewards.sol";
import "../interfaces/IUni.sol";
import "../interfaces/IVaultAPI.sol";
import "../libraries/Address.sol";
import "../libraries/Math.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/SafeMath.sol";
import "./BaseStrategy.sol";


// Global Enums and Structs


struct StrategyParams {
    uint256 performanceFee;
    uint256 activation;
    uint256 debtRatio;
    uint256 minDebtPerHarvest;
    uint256 maxDebtPerHarvest;
    uint256 lastReport;
    uint256 totalDebt;
    uint256 totalGain;
    uint256 totalLoss;
}

// Part: ConvexStable

abstract contract ConvexStable is BaseStrategy {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public constant voter = address(0xF147b8125d2ef93FB6965Db97D6746952a133934);
    address public constant booster = address(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);

    address public constant cvx = address(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    address public constant crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    address public constant weth = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant dai = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant usdc = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant usdt = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant crv3 = address(0x6c3f90f043a72fa612cbac8115ee7e52bde6e490);

    // address public constant quoter = address(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
    // address public constant uniswapv3 = address(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    address public constant uniswap = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address public constant sushiswap = address(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);

    uint256 public constant DENOMINATOR = 10000;

    bool public isClaimRewards;
    bool public isClaimExtras;
    uint256 public id;
    address public rewardContract;
    address public curve;
    IERC20 public want_wrapped;

    uint256 public curve_lp_idx;

    address[] public dex;
    uint256 public keepCRV;

    constructor(address _vault) public BaseStrategy(_vault) {
        minReportDelay = 1 days;
        maxReportDelay = 30 days;
        profitFactor = 100000;
        debtThreshold = 1e24;
        keepCRV = 1000;
        want_wrapped = IERC20(crv3);
        want_wrapped.safeApprove(_vault, uint256(-1)); // Give Vault unlimited access (might save gas)

        if (want == dai) {
            curve_lp_idx = 0;
        } else if (want == usdc) {
            curve_lp_idx = 1;
        } else if (want == usdt) {
            curve_lp_idx = 2;
        } else {
            revert("Strategy cant be applied to this vault");
        }

    }

    function _approveBasic() internal {
        want_wrapped.approve(booster, 0);
        want_wrapped.approve(booster, type(uint256).max);
        IERC20(dai).safeApprove(curve, 0);
        IERC20(dai).safeApprove(curve, type(uint256).max);
        IERC20(usdc).safeApprove(curve, 0);
        IERC20(usdc).safeApprove(curve, type(uint256).max);
        IERC20(usdt).safeApprove(curve, 0);
        IERC20(usdt).safeApprove(curve, type(uint256).max);
    }

    function _approveDex() internal virtual {
        IERC20(crv).approve(dex[0], 0);
        IERC20(crv).approve(dex[0], type(uint256).max);
        IERC20(cvx).approve(dex[1], 0);
        IERC20(cvx).approve(dex[1], type(uint256).max);
    }

    function approveAll() external onlyAuthorized {
        _approveBasic();
        _approveDex();
    }

    function setKeepCRV(uint256 _keepCRV) external onlyAuthorized {
        keepCRV = _keepCRV;
    }

    function switchDex(uint256 _id, address _dex) external onlyAuthorized {
        dex[_id] = _dex;
        _approveDex();
    }

    function setIsClaimRewards(bool _isClaimRewards) external onlyAuthorized {
        isClaimRewards = _isClaimRewards;
    }

    function setIsClaimExtras(bool _isClaimExtras) external onlyAuthorized {
        isClaimExtras = _isClaimExtras;
    }

    function withdrawToConvexDepositTokens() external onlyAuthorized {
        Rewards(rewardContract).withdrawAll(isClaimRewards);
    }

    function withdrawToWrappedTokens() external onlyAuthorized {
        Rewards(rewardContract).withdrawAllAndUnwrap(isClaimRewards);
    }

    function name() external view override returns (string memory) {
        return string(abi.encodePacked("Convex", IERC20Metadata(address(want_wrapped)).symbol()));
    }

    function calc_want_from_wrapped(uint256 wrapped_amount) public view returns (uint256) {
        return ICurveFi(curve).calc_withdraw_one_coin(wrapped_amount, int128(curve_lp_idx));
    }

    function calc_wrapped_from_want(uint256 want_amount) public view returns (uint256) {
        uint256[] memory amounts = new uint256[](3);
        amounts[curve_lp_idx] = want_amount;
        return ICurveFi(curve).calc_token_amount(amounts, true);
    }

    function unwrap(uint256 wrapped_amount) internal returns (uint256) {
        uint256 expected_return = calc_want_from_wrapped(wrapped_amount);
        ICurveFi(curve).remove_liquidity_one_coin(wrapped_amount, int128(curve_lp_idx), 0);
        return expected_return;
    }

    function wrap(uint256 want_amount) internal returns (uint256) {
        uint256 expected_return = calc_wrapped_from_want(want_amount);
        uint256[] memory amounts = new uint256[](3);
        amounts[curve_lp_idx] = want_amount;
        ICurveFi(curve).add_liquidity(amounts, 0);
        return expected_return;
    }

    function balanceOfWant() public view returns (uint256) {
        return want.balanceOf(address(this));
    }

    function balanceOfPool() public view returns (uint256) {
        return Rewards(rewardContract).balanceOf(address(this));
    }

    function balanceOfWrapped() public view returns (uint256) {
        return want_wrapped.balanceOf(address(this));
    }

    function estimatedTotalAssets() public view override returns (uint256) {
        uint256 total_wrapped = estimatedTotalWrappedAssets();
        return calc_want_from_wrapped(total_assets) + balanceOfWant();
    }

    function estimatedTotalWrappedAssets() public view returns (uint256) {
        return balanceOfWrapped().add(balanceOfPool());
    }

    function adjustPosition(uint256 _debtOutstanding) internal override {
        // _debtOutstanding - unwrapped token
        if (emergencyExit) return;
        wrap(balanceOfWant());

        uint256 _wrapped = balanceOfWrapped();
        if (_wrapped > 0) {
            Booster(booster).deposit(id, _wrapped, true);
        }
    }

    // _amount - wrapped token amount
    function _withdrawSome(uint256 _amount) internal returns (uint256) {
        _amount = Math.min(_amount, balanceOfPool());
        uint _before = balanceOfWrapped();
        Rewards(rewardContract).withdrawAndUnwrap(_amount, false);
        return balanceOfWrapped().sub(_before);
    }

    // _amountNeeded - wrapped token amount must be provided
    // _liquidatedAmount and loss are in wrapped also
    function liquidatePosition(uint256 _amountNeeded)
    internal
    override
    returns (uint256 _liquidatedAmount, uint256 _loss)
    {
        uint256 _balance = balanceOfWrapped();
        if (_balance < _amountNeeded) {
            _liquidatedAmount = _withdrawSome(_amountNeeded.sub(_balance));
            _liquidatedAmount = _liquidatedAmount.add(_balance);
            _loss = _amountNeeded.sub(_liquidatedAmount); // this should be 0. o/w there must be an error
        }
        else {
            _liquidatedAmount = _amountNeeded;
        }
    }

    function prepareMigration(address _newStrategy) internal override {
        Rewards(rewardContract).withdrawAllAndUnwrap(isClaimRewards);
        _migrateRewards(_newStrategy);
        want_wrapped.safeTransfer(_newStrategy, balanceOfWrapped());
    }

    function _migrateRewards(address _newStrategy) internal virtual {
        IERC20(crv).safeTransfer(_newStrategy, IERC20(crv).balanceOf(address(this)));
        IERC20(cvx).safeTransfer(_newStrategy, IERC20(cvx).balanceOf(address(this)));
    }

    function _adjustCRV(uint256 _crv) internal returns (uint256) {
        uint256 _keepCRV = _crv.mul(keepCRV).div(DENOMINATOR);
        if (_keepCRV > 0) IERC20(crv).safeTransfer(voter, _keepCRV);
        return _crv.sub(_keepCRV);
    }

    function _claimableBasicInETH() internal view returns (uint256) {
        uint256 _crv = Rewards(rewardContract).earned(address(this));

        // calculations pulled directly from CVX's contract for minting CVX per CRV claimed
        uint256 totalCliffs = 1000;
        uint256 maxSupply = 1e8 * 1e18; // 100m
        uint256 reductionPerCliff = 1e5 * 1e18; // 100k
        uint256 supply = IERC20(cvx).totalSupply();
        uint256 _cvx;

        uint256 cliff = supply.div(reductionPerCliff);
        // mint if below total cliffs
        if (cliff < totalCliffs) {
            // for reduction% take inverse of current cliff
            uint256 reduction = totalCliffs.sub(cliff);
            // reduce
            _cvx = _crv.mul(reduction).div(totalCliffs);

            // supply cap check
            uint256 amtTillMax = maxSupply.sub(supply);
            if (_cvx > amtTillMax) {
                _cvx = amtTillMax;
            }
        }

        uint256 crvValue;
        if (_crv > 0) {
            address[] memory path = new address[](2);
            path[0] = crv;
            path[1] = weth;
            uint256[] memory crvSwap = Uni(dex[0]).getAmountsOut(_crv, path);
            crvValue = crvSwap[1];
        }

        uint256 cvxValue;
        if (_cvx > 0) {
            address[] memory path = new address[](2);
            path[0] = cvx;
            path[1] = weth;
            uint256[] memory cvxSwap = Uni(dex[1]).getAmountsOut(_cvx, path);
            cvxValue = cvxSwap[1];
        }

        return crvValue.add(cvxValue);
    }

    function _claimableInETH() internal virtual view returns (uint256 _claimable) {
        _claimable = _claimableBasicInETH();
    }

    // NOTE: Can override `tendTrigger` and `harvestTrigger` if necessary
    function harvestTrigger(uint256 callCost) public override view returns (bool) {
        StrategyParams memory params = vault.strategies(address(this));

        if (params.activation == 0) return false;

        if (block.timestamp.sub(params.lastReport) < minReportDelay) return false;

        if (block.timestamp.sub(params.lastReport) >= maxReportDelay) return true;

        uint256 outstanding = vault.debtOutstanding();
        if (outstanding > debtThreshold) return true;

        uint256 total = estimatedTotalAssets();
        if (total.add(debtThreshold) < params.totalDebt) return true;

        return (profitFactor.mul(callCost) < _claimableInETH());
    }

    /**
     * @notice
     *  Harvests the Strategy, recognizing any profits or losses and adjusting
     *  the Strategy's position.
     *
     *  In the rare case the Strategy is in emergency shutdown, this will exit
     *  the Strategy's position.
     *
     *  This may only be called by governance, the strategist, or the keeper.
     * @dev
     *  When `harvest()` is called, the Strategy reports to the Vault (via
     *  `vault.report()`), so in some cases `harvest()` must be called in order
     *  to take in profits, to borrow newly available funds from the Vault, or
     *  otherwise adjust its position. In other cases `harvest()` must be
     *  called to report to the Vault on the Strategy's position, especially if
     *  any losses have occurred.
     */
    function harvest() external override onlyKeepers {
        uint256 profit = 0;
        uint256 loss = 0;
        uint256 debtOutstanding = calc_wrapped_from_want(vault.debtOutstanding());
        uint256 debtPayment = 0;

        if (emergencyExit) {
            // Free up as much capital as possible
            uint256 totalAssets = estimatedTotalWrappedAssets();
            // NOTE: use the larger of total assets or debt outstanding to book losses properly
            (debtPayment, loss) = liquidatePosition(totalAssets > debtOutstanding ? totalAssets : debtOutstanding);
            // NOTE: take up any remainder here as profit
            if (debtPayment > debtOutstanding) {
                profit = debtPayment.sub(debtOutstanding);
                debtPayment = debtOutstanding;
            }
        } else {
            // Free up returns for Vault to pull
            (profit, loss, debtPayment) = prepareReturn(debtOutstanding);
        }

        // we should be able to give profit + debtPayment to vault
        uint256 want_profit = unwrap(profit);
        uint256 want_loss = calc_want_from_wrapped(loss);
        uint256 want_debtPayment = unwrap(debtPayment);

        // Allow Vault to take up to the "harvested" balance of this contract,
        // which is the amount it has earned since the last time it reported to
        // the Vault.
        debtOutstanding = vault.report(want_profit, want_loss, want_debtPayment);

        // Check if free returns are left, and re-invest them
        adjustPosition(debtOutstanding);

        emit Harvested(want_profit, want_loss, want_debtPayment, debtOutstanding);
    }

    /**
     * @notice
     *  Withdraws `_amountNeeded` to `vault`.
     * _amountNeeded provided in unwrapped tokens
     *
     *  This may only be called by the Vault.
     * @param _amountNeeded How much `want` to withdraw.
     * @return _loss Any realized losses
     */
    function withdraw(uint256 _amountNeeded) external virtual returns (uint256 _loss) {
        require(msg.sender == address(vault), "!vault");
        // Liquidate as much as possible to `want`, up to `_amountNeeded`
        _amountNeeded = calc_wrapped_from_want(_amountNeeded);

        uint256 amountFreed;
        (amountFreed, _loss) = liquidatePosition(_amountNeeded);
        // Send it directly back (NOTE: Using `msg.sender` saves some gas here)

        amountFreed = unwrap(amountFreed);
        _loss = calc_want_from_wrapped(_loss);

        want.safeTransfer(msg.sender, amountFreed);
        // NOTE: Reinvest anything leftover on next `tend`/`harvest`
    }

    /**
     * @notice
     *  Removes tokens from this Strategy that are not the type of tokens
     *  managed by this Strategy. This may be used in case of accidentally
     *  sending the wrong kind of token to this Strategy.
     *
     *  Tokens will be sent to `governance()`.
     *
     *  This will fail if an attempt is made to sweep `want`, or any tokens
     *  that are protected by this Strategy.
     *
     *  This may only be called by governance.
     * @dev
     *  Implement `protectedTokens()` to specify any additional tokens that
     *  should be protected from sweeping in addition to `want`.
     * @param _token The token to transfer out of this vault.
     */
    // TODO: remove all protected tokens and set to onlyAuthorized?
    function sweep(address _token) external onlyGovernance {
        require(_token != address(want), "!want");
        require(_token != address(want_wrapped), "!want wrapped");

        address[] memory _protectedTokens = protectedTokens();
        for (uint256 i; i < _protectedTokens.length; i++) require(_token != _protectedTokens[i], "!protected");

        IERC20(_token).safeTransfer(governance(), IERC20(_token).balanceOf(address(this)));
    }
}

// File: 3pool.sol

contract Strategy is ConvexStable {
    address[] public pathTarget;

    constructor(address _vault) public ConvexStable(_vault) {
        curve = address(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
        id = 9;
        isClaimRewards = true; // default is true, turn off in emergency
        // isClaimExtras = true; // add this if there are extra rewards

        (address _lp,,,address _reward,,) = Booster(booster).poolInfo(id);
        require(_lp == address(want), "constructor: incorrect lp token");
        rewardContract = _reward;

        _approveBasic();
        pathTarget = new address[](2);
        _setPathTarget(0, 0); // crv path target
        _setPathTarget(1, 0); // cvx path target

        dex = new address[](2);
        dex[0] = sushiswap; // crv
        dex[1] = sushiswap; // cvx
        _approveDex();
    }

    // >>> approve other rewards on dex
    // function _approveDex() internal override { super._approveDex(); }

    // >>> include other rewards
    // function _migrateRewards(address _newStrategy) internal override { super._migrateRewards(_newStrategy); }

    // >>> include all other rewards in eth besides _claimableBasicInETH()
    // function _claimableInETH() internal override view returns (uint256 _claimable) { _claimable = super._claimableInETH(); }

    function _setPathTarget(uint _tokenId, uint _id) internal {
        if (_id == 0) {
            pathTarget[_tokenId] = dai;
        }
        else if (_id == 1) {
            pathTarget[_tokenId] = usdc;
        }
        else {
            pathTarget[_tokenId] = usdt;
        }
    }

    function setPathTarget(uint _tokenId, uint _id) external onlyAuthorized {
        _setPathTarget(_tokenId, _id);
    }

    function prepareReturn(uint256 _debtOutstanding)
    internal
    override
    returns (
        uint256 _profit,
        uint256 _loss,
        uint256 _debtPayment
    )
    {
        uint before = balanceOfWrapped();
        Rewards(rewardContract).getReward(address(this), isClaimExtras);
        uint256 _crv = IERC20(crv).balanceOf(address(this));
        if (_crv > 0) {
            _crv = _adjustCRV(_crv);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = pathTarget[0];

            Uni(dex[0]).swapExactTokensForTokens(_crv, uint256(0), path, address(this), now);
        }
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        if (_cvx > 0) {
            address[] memory path = new address[](3);
            path[0] = cvx;
            path[1] = weth;
            path[2] = pathTarget[1];

            Uni(dex[1]).swapExactTokensForTokens(_cvx, uint256(0), path, address(this), now);
        }
        uint256 _dai = IERC20(dai).balanceOf(address(this));
        uint256 _usdc = IERC20(usdc).balanceOf(address(this));
        uint256 _usdt = IERC20(usdt).balanceOf(address(this));
        if (_dai > 0 || _usdc > 0 || _usdt > 0) {
            ICurveFi(curve).add_liquidity([_dai, _usdc, _usdt], 0);
        }
        _profit = balanceOfWrapped().sub(before);

        uint _total = estimatedTotalWrappedAssets();
        uint _debt = calc_wrapped_from_want(vault.strategies(address(this)).totalDebt);
        if (_total < _debt) {
            _loss = _debt - _total;
            _profit = 0;
        }

        if (_debtOutstanding > 0) {
            _withdrawSome(_debtOutstanding);
            _debtPayment = Math.min(_debtOutstanding, balanceOfWrapped().sub(_profit));
        }
    }

    function protectedTokens()
    internal
    view
    override
    returns (address[] memory)
    {
        address[] memory protected = new address[](2);
        protected[0] = crv;
        protected[1] = cvx;
        return protected;
    }
}