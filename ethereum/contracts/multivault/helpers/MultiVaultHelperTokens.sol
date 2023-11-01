// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "../../interfaces/multivault/IMultiVaultFacetTokens.sol";
import "../../interfaces/multivault/IMultiVaultFacetWithdraw.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokensEvents.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokenFactory.sol";
import "../../interfaces/IEverscale.sol";

import "../storage/MultiVaultStorage.sol";
import "./MultiVaultHelperEmergency.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";


abstract contract MultiVaultHelperTokens is
    MultiVaultHelperEmergency,
    IMultiVaultFacetTokensEvents
{
    modifier initializeToken(address _token) {
        _initializeToken(_token);
        _;
    }

    modifier initializeWethToken() {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        _initializeToken(s.weth);
        _;
    }

    function _initializeToken(address _token) internal {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();
        if (s.tokens_[_token].activation == 0) {
            // Non-activated tokens are always aliens, native tokens are activate on the first `saveWithdrawNative`

            require(
                IERC20Metadata(_token).decimals() <= MultiVaultStorage.DECIMALS_LIMIT &&
                bytes(IERC20Metadata(_token).symbol()).length <= MultiVaultStorage.SYMBOL_LENGTH_LIMIT &&
                bytes(IERC20Metadata(_token).name()).length <= MultiVaultStorage.NAME_LENGTH_LIMIT,
                "Tokens: invalid token meta"
            );

            _activateToken(_token, false);
        }
    }

    modifier tokenNotBlacklisted(address _token) {
        bool isBlackListed = isTokenNoBlackListed(_token);
        require(!isBlackListed, "Tokens: token is blacklisted");

        _;
    }
    modifier wethNotBlacklisted() {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();
        bool isBlackListed = isTokenNoBlackListed(s.weth);
        require(!isBlackListed, "Tokens: weth is blacklisted");

        _;
    }
    function isTokenNoBlackListed(address _token) internal view returns (bool) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();
        return s.tokens_[_token].blacklisted;
    }

    function _activateToken(
        address token,
        bool isNative
    ) internal {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        uint depositFee = isNative ? s.defaultNativeDepositFee : s.defaultAlienDepositFee;
        uint withdrawFee = isNative ? s.defaultNativeWithdrawFee : s.defaultAlienWithdrawFee;

        s.tokens_[token] = IMultiVaultFacetTokens.Token({
            activation: block.number,
            blacklisted: false,
            isNative: isNative,
            depositFee: depositFee,
            withdrawFee: withdrawFee,
            custom: address(0),
            depositLimit: 0
        });

        emit TokenActivated(
            token,
            block.number,
            isNative,
            depositFee,
            withdrawFee
        );
    }

    function _getNativeWithdrawalToken(
        IMultiVaultFacetWithdraw.NativeWithdrawalParams memory withdrawal
    ) internal returns (address) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        // Derive native token address from the Everscale (token wid, token addr)
        address token = IMultiVaultFacetTokenFactory(address(this)).getNativeToken(
            withdrawal.native.wid,
            withdrawal.native.addr
        );

        // Token is being withdrawn first time - activate it (set default parameters)
        // And deploy ERC20 representation
        if (s.tokens_[token].activation == 0) {
            IMultiVaultFacetTokenFactory(address(this)).deployTokenForNative(
                withdrawal.native.wid,
                withdrawal.native.addr,
                withdrawal.meta.name,
                withdrawal.meta.symbol,
                withdrawal.meta.decimals
            );
        
            emit TokenCreated(
                token,
                withdrawal.native.wid,
                withdrawal.native.addr,
                string(''),
                string(''),
                withdrawal.meta.name,
                withdrawal.meta.symbol,
                withdrawal.meta.decimals
            );

            _activateToken(token, true);

            s.natives_[token] = withdrawal.native;
        }

        // Check if there is a custom ERC20 representing this withdrawal.native
        address custom = s.tokens_[token].custom;

        if (custom != address(0)) return custom;

        return token;
    }

    function _limitsViolated(
        address token,
        uint amount
    ) internal view returns(bool) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        uint depositLimit = s.tokens_[token].depositLimit;

        if (depositLimit == 0) return false;

        uint balance = IERC20(token).balanceOf(address(this));

        return (balance + amount) > depositLimit;
    }
}
