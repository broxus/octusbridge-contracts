// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library UniversalERC20 {
    using SafeERC20 for IERC20;

    function universalTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        token.safeTransferFrom(from, to, amount);
    }

    function universalTransfer(
        IERC20 token,
        address to,
        uint256 amount
    ) internal returns(bool) {
        if (amount == 0) {
            return true;
        }

        token.safeTransfer(to, amount);
        return true;
    }
}
