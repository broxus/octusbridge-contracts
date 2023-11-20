// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


library MultiVaultStorageInitializable {
    bytes32 constant public INITIALIZABLE_LEGACY_STORAGE_POSITION = 0x0000000000000000000000000000000000000000000000000000000000000000;

    struct InitializableStorage {
        uint8 _initialized;
        bool _initializing;
    }

    function _storage() internal pure returns (InitializableStorage storage s) {
        assembly {
            s.slot := INITIALIZABLE_LEGACY_STORAGE_POSITION
        }
    }
}
