// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "../../interfaces/multivault/IMultiVaultFacetLiquidityEvents.sol";
import "../../interfaces/multivault/IMultiVaultFacetLiquidity.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokenFactory.sol";
import "../storage/MultiVaultStorage.sol";


abstract contract MultiVaultHelperLiquidity is IMultiVaultFacetLiquidityEvents {
    modifier onlyActivatedLP(address token) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        require(s.liquidity[token].activation != 0, "Liquidity: LP not activated");

        _;
    }

    function _getLPToken(
        address token
    ) internal view returns (address lp) {
        return IMultiVaultFacetTokenFactory(address(this)).getLPToken(token);
    }

    function _exchangeRateCurrent(
        address token
    ) internal view returns(uint) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        IMultiVaultFacetLiquidity.Liquidity memory liquidity = s.liquidity[token];

        if (liquidity.supply == 0 || liquidity.activation == 0) return MultiVaultStorage.LP_EXCHANGE_RATE_BPS;

        return MultiVaultStorage.LP_EXCHANGE_RATE_BPS * liquidity.cash / liquidity.supply;
    }

    function _getCash(
        address token
    ) internal view returns(uint) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        IMultiVaultFacetLiquidity.Liquidity memory liquidity = s.liquidity[token];

        return liquidity.cash;
    }

    function _getSupply(
        address token
    ) internal view returns(uint) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        IMultiVaultFacetLiquidity.Liquidity memory liquidity = s.liquidity[token];

        return liquidity.supply;
    }

    function _convertLPToUnderlying(
        address token,
        uint amount
    ) internal view returns (uint) {
        return _exchangeRateCurrent(token) * amount / MultiVaultStorage.LP_EXCHANGE_RATE_BPS;
    }

    function _convertUnderlyingToLP(
        address token,
        uint amount
    ) internal view returns (uint) {
        return MultiVaultStorage.LP_EXCHANGE_RATE_BPS * amount / _exchangeRateCurrent(token);
    }

    function _increaseTokenCash(
        address token,
        uint amount
    ) internal {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        if (amount == 0) return;

        s.liquidity[token].cash += amount;

        emit EarnTokenCash(token, amount);
    }
}
