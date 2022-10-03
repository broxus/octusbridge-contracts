// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../../interfaces/IEverscale.sol";
import "../storage/VaultStorageVault.sol";
import "./VaultHelperTargetDecimals.sol";
import "../../interfaces/vault/IVaultFacetDepositEvents.sol";


contract VaultHelperEverscale is VaultHelperTargetDecimals, IVaultFacetDepositEvents {
    function _transferToEverscale(
        IEverscale.EverscaleAddress memory recipient,
        uint256 _amount
    ) internal {
        uint256 amount = convertToTargetDecimals(_amount);

        emit Deposit(amount, recipient.wid, recipient.addr);
    }
}
