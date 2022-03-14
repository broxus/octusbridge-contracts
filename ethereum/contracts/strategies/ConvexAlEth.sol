// SPDX-License-Identifier: AGPL-3.0

/**
 *Submitted for verification at Etherscan.io on 2021-05-28
*/

pragma solidity ^0.8.2;
pragma experimental ABIEncoderV2;


import "../interfaces/IBooster.sol";
import "../interfaces/ICurveFi.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/IRewards.sol";
import "../interfaces/IUni.sol";
import "../libraries/Address.sol";
import "../libraries/Math.sol";
import "../libraries/SafeERC20.sol";
import "../interfaces/IWeth.sol";
import "./ConvexCrvLp.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";



abstract contract ConvexWEth is ConvexCrvLp {
    using SafeERC20 for IERC20;

    address public constant CrvAlEth = address(0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e);

    function _initialize(
        address _vault
    ) internal override {
        BaseStrategy._initialize(_vault);

        slippage_factor = 300;
        minReportDelay = 1 days;
        maxReportDelay = 30 days;
        profitFactor = 100000;
        debtThreshold = 1e21;
        want_wrapped = IERC20(CrvAlEth);
        want_wrapped.safeApprove(_vault, type(uint256).max); // Give Vault unlimited access (might save gas)

        curve_lp_idx = 0;
    }

    function _approveBasic() internal override {
        want_wrapped.safeApprove(booster, 0);
        want_wrapped.safeApprove(booster, type(uint256).max);
        IERC20(weth).safeApprove(curve, 0);
        IERC20(weth).safeApprove(curve, type(uint256).max);
    }

    function _approveDex() internal override {
        IERC20(crv).safeApprove(dex[0], 0);
        IERC20(crv).safeApprove(dex[0], type(uint256).max);
        IERC20(cvx).safeApprove(dex[1], 0);
        IERC20(cvx).safeApprove(dex[1], type(uint256).max);
    }

    function calc_wrapped_from_want(uint256 want_amount) public view override returns (uint256) {
        return ICurveFi(curve).calc_token_amount([want_amount, 0], true);
    }

    receive() external payable {
        require (msg.sender == weth || msg.sender == curve || msg.sender == dex[0] || msg.sender == dex[1], "Bad sender");
    }

    function unwrap(uint256 wrapped_amount) internal override returns (uint256 result_val) {
        if (wrapped_amount > 0) {
            ICurveFi(curve).remove_liquidity_one_coin(wrapped_amount, 0, 0);
            result_val = address(this).balance;
            IWeth(weth).deposit{value: result_val}();
        }
    }

    function wrap(uint256 want_amount) internal override returns (uint256 expected_return) {
        if (want_amount > 0) {
            expected_return = calc_wrapped_from_want(want_amount);
            // convert weth to eth
            IWeth(weth).withdraw(want_amount);
            ICurveFi(curve).add_liquidity{value: want_amount}([want_amount, 0], 0);
        }
    }
}


contract ConvexCrvAlEthStrategy is ConvexWEth, Initializable {
    function initialize(
        address _vault
    ) external initializer {
        ConvexWEth._initialize(_vault);

        curve = address(0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e);
        id = 49;
        isClaimRewards = true; // default is true, turn off in emergency
        // isClaimExtras = true; // add this if there are extra rewards

        (address _lp,,,address _reward,,) = Booster(booster).poolInfo(id);
        require(_lp == address(want_wrapped), "constructor: incorrect lp token");
        rewardContract = _reward;

        _approveBasic();

        dex = new address[](2);
        dex[0] = sushiswap; // crv
        dex[1] = sushiswap; // cvx
        _approveDex();
    }

    // >>> approve other rewards on dex
    // function _approveDex() internal override {}

    // >>> include other rewards
    // function _migrateRewards(address _newStrategy) internal override {}

    // >>> include all other rewards in eth besides _claimableBasicInETH()
    // function _claimableInETH() internal override view returns (uint256 _claimable) {}

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
            address[] memory path = new address[](2);
            path[0] = crv;
            path[1] = weth;

            Uni(dex[0]).swapExactTokensForETH(_crv, uint256(0), path, address(this), block.timestamp);
        }
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        if (_cvx > 0) {
            address[] memory path = new address[](2);
            path[0] = cvx;
            path[1] = weth;

            Uni(dex[1]).swapExactTokensForETH(_cvx, uint256(0), path, address(this), block.timestamp);
        }
        // sell extra rewards here
        uint256 _eth = address(this).balance;
        if (_eth > 0) {
            ICurveFi(curve).add_liquidity{value: _eth}([_eth, 0], 0);
        }
        _profit = balanceOfWrapped() - before;

        uint _total = estimatedTotalWrappedAssets();
        uint _debt = calc_wrapped_from_want(vault.strategies(address(this)).totalDebt);
        if (_total < _debt) {
            _loss = _debt - _total;
            _profit = 0;
        }

        if (_debtOutstanding > 0) {
            _withdrawSome(_debtOutstanding);
            _debtPayment = Math.min(_debtOutstanding, balanceOfWrapped() - _profit);
        }
    }
}
