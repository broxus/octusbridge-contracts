// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "../storage/VaultStorageVault.sol";


abstract contract VaultHelperEmergency {
    modifier onlyEmergencyDisabled() {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(!s.emergencyShutdown, "Vault: emergency mode enabled");

        _;
    }
}
