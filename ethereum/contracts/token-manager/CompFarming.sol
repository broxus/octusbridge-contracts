// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./../interfaces/IComptroller.sol";
import "./../interfaces/ICToken.sol";

import "./../libraries/UniversalERC20.sol";

import "./Mockup.sol";


/// @title Comp farming token manager for Broxus bridge
/// @dev Syncs tokens with parent token lock contract and opens token-token position on Compound.
/// Supported tokens - Dai, USDT, USDC, WBTC, Uni.
/// In case token manager owns tokens to Token lock - partially close position.
/// In case token lock has additional tokens for the token manager - extend position.
contract CompFarmingTokenManager is MockupTokenManager, Initializable {
    using UniversalERC20 for IERC20;

    address public constant COMPTROLLER = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    address public cToken;

    function initialize(
        address _tokenLock,
        address _cToken
    ) external initializer {
        tokenLock = _tokenLock;
        cToken = _cToken;

        token = ITokenLock(tokenLock).token();

        _enterCompoundMarket();

//        IToken(cToken).approve(cToken, type(uint).max);
    }

    /// @dev Unlock tokens from Compound.
    /// @param amount Amount of tokens to unlock
    function _unlock(uint amount) internal override {
        uint amountToRepay = amount * 10000 / 7499;

        IERC20(cToken).approve(cToken, amount);

        require(ICToken(cToken).redeemUnderlying(amount) == 0, "Token manager: redeem failed");
        require(ICToken(cToken).repayBorrow(amountToRepay) == 0, "Token manager: repay failed");
    }

    /// @dev Lock tokens into Compound.
    /// @param amount Amount of tokens to lock
    function _lock(uint amount) internal override {
        IERC20(token).approve(cToken, amount);

        require(ICToken(cToken).mint(amount) == 0, "Token manager: mint failed");

        uint amountToBorrow = amount * 7499 / 10000; // ~75%

        require(ICToken(cToken).borrow(amountToBorrow) == 0, "Token manager: borrow failed");
    }

    function _enterCompoundMarket() internal {
        address[] memory markets = new address[](1);
        markets[0] = token;

        IComptroller(COMPTROLLER).enterMarkets(markets);
    }
}
