// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "../storage/VaultStorageVault.sol";
import "./VaultHelperTokenBalance.sol";


abstract contract VaultHelperDeposit is VaultHelperTokenBalance {
    modifier respectDepositLimit(uint amount) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(
            _totalAssets() + amount <= s.depositLimit,
            "Vault: respect the deposit limit"
        );

        _;
    }
}
