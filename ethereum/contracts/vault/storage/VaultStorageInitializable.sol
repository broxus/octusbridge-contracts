// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
//import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


library VaultStorageInitializable {
    bytes32 constant INITIALIZABLE_LEGACY_STORAGE_POSITION = 0x0000000000000000000000000000000000000000000000000000000000000001;

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
