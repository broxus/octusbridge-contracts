// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "../../interfaces/multivault/IMultiVaultFacetTokens.sol";

// import "../MultiVaultToken.sol";
import "../storage/MultiVaultStorage.sol";

import "../helpers/MultiVaultHelperActors.sol";
import "../helpers/MultiVaultHelperTokens.sol";


contract MultiVaultFacetTokens is
    MultiVaultHelperActors,
    MultiVaultHelperTokens,
    IMultiVaultFacetTokens
{
    /// @notice Get token prefix
    /// @dev Used to set up in advance prefix for the ERC20 native token
    /// @param _token Token address
    /// @return Name and symbol prefix
    function prefixes(
        address _token
    ) external view override returns (IMultiVaultFacetTokens.TokenPrefix memory) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        return s.prefixes_[_token];
    }

    /// @notice Get token information
    /// @param _token Token address
    function tokens(
        address _token
    ) external view override returns (IMultiVaultFacetTokens.Token memory) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        return s.tokens_[_token];
    }

    /// @notice Get native Everscale token address for EVM token
    /// @param _token Token address
    function natives(
        address _token
    ) external view override returns (IEverscale.EverscaleAddress memory) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        return s.natives_[_token];
    }

    function setTokenBlacklist(
        address token,
        bool blacklisted
    ) external override onlyGovernance {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        s.tokens_[token].blacklisted = blacklisted;

        emit UpdateTokenBlacklist(token, blacklisted);
    }

    function setDepositLimit(
        address token,
        uint limit
    ) external override onlyGovernance {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        s.tokens_[token].depositLimit = limit;

        emit UpdateTokenDepositLimit(token, limit);
    }
}
