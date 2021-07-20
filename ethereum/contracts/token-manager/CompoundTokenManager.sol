// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;


import "./../interfaces/ITokenManager.sol";

contract CompoundTokenManager is ITokenManager {
    /// @dev Sync token manager with token lock.
    /// @dev If token manager has more tokens than it should be - partially close position
    /// @dev and transfer excess tokens to token lock.
    /// @dev If token lock has additional tokens for token manager - request them and extend position
    function sync() override public {

    }
}
