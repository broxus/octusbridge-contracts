// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./../interfaces/IComptroller.sol";
import "./../interfaces/ICToken.sol";

import "./../libraries/UniversalERC20.sol";

import "./Mockup.sol";

import "hardhat/console.sol";


/// @title Comp farming token manager for Broxus bridge
/// @dev Syncs tokens with parent token lock contract and opens token-token position on Compound.
/// Supported tokens - Dai, USDT, USDC, WBTC, Uni.
/// In case token manager owns tokens to Token lock - partially close position.
/// In case token lock has additional tokens for the token manager - extend position.
contract CompFarmingTokenManager is MockupTokenManager, Initializable {
    using UniversalERC20 for IERC20;

    address public constant COMPTROLLER = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    address public cToken;

    event Report(address token, uint256 amount);

    function initialize(
        address _tokenLock,
        address _cToken
    ) external initializer {
        tokenLock = _tokenLock;
        cToken = _cToken;

        token = ITokenLock(tokenLock).token();

        _enterCompoundMarket();

        IERC20(cToken).approve(cToken, type(uint).max);
        IERC20(token).approve(cToken, type(uint).max);
    }

    /// @dev Unlock tokens from Compound.
    /// @param amount Amount of tokens to unlock
    function _unlock(uint amount) internal override {
        uint amountToRepay = amount * 7499 / 10000;

//        console.log(amount, amountToRepay);

        require(ICToken(cToken).repayBorrow(amountToRepay) == 0, "Token manager: repay failed");

//        console.log(1);

        require(ICToken(cToken).redeemUnderlying(amount) == 0, "Token manager: redeem failed");

//        console.log(2);
    }

    /// @dev Lock tokens into Compound.
    /// @param amount Amount of tokens to lock
    function _lock(uint amount) internal override {
        uint amountToBorrow = amount * 7499 / 10000; // ~75%

        require(ICToken(cToken).mint(amount) == 0, "Token manager: mint failed");
        require(ICToken(cToken).borrow(amountToBorrow) == 0, "Token manager: borrow failed");
    }

    function report() public override {
        emit Report(cToken, IERC20(cToken).balanceOf(address(this)));
    }

    function _enterCompoundMarket() internal {
        address[] memory markets = new address[](1);
        markets[0] = token;

        IComptroller(COMPTROLLER).enterMarkets(markets);
    }
}
