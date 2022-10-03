// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../../interfaces/vault/IVaultFacetWithdraw.sol";
import "../../interfaces/IEverscale.sol";
import "./VaultHelperTargetDecimals.sol";


abstract contract VaultHelperWithdraw is VaultHelperTargetDecimals {
    modifier withdrawalNotSeenBefore(bytes memory payload) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        bytes32 withdrawalId = keccak256(payload);

        require(!s.withdrawalIds[withdrawalId], "Vault: withdraw payload already seen");

        s.withdrawalIds[withdrawalId] = true;

        _;
    }
}
