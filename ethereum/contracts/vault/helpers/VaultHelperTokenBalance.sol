// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


abstract contract VaultHelperTokenBalance {
    using SafeERC20 for IERC20;

    function _vaultTokenBalance() internal view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return IERC20(s.token).balanceOf(address(this));
    }

    function _totalAssets() internal view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return _vaultTokenBalance() + s.totalDebt;
    }
}
