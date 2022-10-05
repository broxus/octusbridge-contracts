// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "../../interfaces/multivault/IMultiVaultFacetFees.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokens.sol";

import "../storage/MultiVaultStorage.sol";


abstract contract MultiVaultHelperFee {
    modifier respectFeeLimit(uint fee) {
        require(fee <= MultiVaultStorage.FEE_LIMIT);

        _;
    }

    /// @notice Calculates fee for deposit or withdrawal.
    /// @param amount Amount of tokens.
    /// @param _token Token address.
    /// @param fee Fee type (Deposit = 0, Withdraw = 1).
    function _calculateMovementFee(
        uint256 amount,
        address _token,
        IMultiVaultFacetFees.Fee fee
    ) internal view returns (uint256) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        IMultiVaultFacetTokens.Token memory token = s.tokens_[_token];

        uint tokenFee = fee == IMultiVaultFacetFees.Fee.Deposit ? token.depositFee : token.withdrawFee;

        return tokenFee * amount / MultiVaultStorage.MAX_BPS;
    }

    function _increaseTokenFee(
        address token,
        uint amount
    ) internal {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        if (amount > 0) s.fees[token] += amount;
    }
}
