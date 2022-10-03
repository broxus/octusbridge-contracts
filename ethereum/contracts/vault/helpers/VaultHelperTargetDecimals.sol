// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";


abstract contract VaultHelperTargetDecimals {
    function convertToTargetDecimals(
        uint256 amount
    ) public view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint256 targetDecimals = s.targetDecimals;
        uint256 tokenDecimals = s.tokenDecimals;

        if (targetDecimals == tokenDecimals) {
            return amount;
        } else if (targetDecimals > tokenDecimals) {
            return amount * 10 ** (targetDecimals - tokenDecimals);
        } else {
            return amount / 10 ** (tokenDecimals - targetDecimals);
        }
    }

    function convertFromTargetDecimals(
        uint256 amount
    ) public view returns (uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        uint256 targetDecimals = s.targetDecimals;
        uint256 tokenDecimals = s.tokenDecimals;

        if (targetDecimals == tokenDecimals) {
            return amount;
        } else if (targetDecimals > tokenDecimals) {
            return amount / 10 ** (targetDecimals - tokenDecimals);
        } else {
            return amount * 10 ** (tokenDecimals - targetDecimals);
        }
    }
}
