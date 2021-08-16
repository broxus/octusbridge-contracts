// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


import "./../interfaces/ITokenManager.sol";
import "./../interfaces/ITokenLock.sol";

import "./../libraries/UniversalERC20.sol";


/// @title Example of Broxus bridge token manager.
/// In case token manager owns tokens to Token lock - pay the debt.
/// In case token lock has additional tokens for the token manager - picks them up.
contract MockupTokenManager is ITokenManager {
    using UniversalERC20 for IERC20;

    address public tokenLock;
    address public token;


    /// @dev Sync token manager with token lock.
    function sync() override public {
        (ITokenLock.TokenManagerStatus status, uint256 tokens) = ITokenLock(tokenLock)
            .getTokenManagerStatus(address(this));

        if (status == ITokenLock.TokenManagerStatus.Deficit) {
            // Token manager is in debt to token lock.
            _unlock(tokens);

            IERC20(token).approve(tokenLock, tokens);

            ITokenLock(tokenLock).payDeficit(address(this), tokens);
        } else if (status == ITokenLock.TokenManagerStatus.Proficit) {
            ITokenLock(tokenLock).requestProficitApprove(address(this));

            IERC20(token).transferFrom(tokenLock, address(this), tokens);

            _lock(tokens);
        }
    }

    function _unlock(uint256 tokens) internal virtual {

    }

    function _lock(uint256 tokens) internal virtual {

    }

    function report() public override virtual {

    }
}
