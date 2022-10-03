// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../storage/VaultStorageReentrancyGuard.sol";


abstract contract VaultHelperReentrancyGuard {
    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        VaultStorageReentrancyGuard.ReentrancyGuardStorage storage s = VaultStorageReentrancyGuard._storage();

        // On the first call to nonReentrant, _notEntered will be true
        require(s._status != VaultStorageReentrancyGuard._ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        s._status = VaultStorageReentrancyGuard._ENTERED;
    }

    function _nonReentrantAfter() private {
        VaultStorageReentrancyGuard.ReentrancyGuardStorage storage s = VaultStorageReentrancyGuard._storage();

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        s._status = VaultStorageReentrancyGuard._NOT_ENTERED;
    }
}
