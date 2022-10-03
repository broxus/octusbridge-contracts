// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";


abstract contract VaultHelperFee {
    function _calculateMovementFee(
        uint256 amount,
        uint256 fee
    ) internal pure returns (uint256) {
        if (fee == 0) return 0;

        return amount * fee / VaultStorageVault.MAX_BPS;
    }
}
