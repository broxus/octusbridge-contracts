// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "./IVaultFacetDeposit.sol";
import "./IVaultFacetManagement.sol";
import "./IVaultFacetStrategies.sol";
import "./IVaultFacetWithdraw.sol";


interface IVault is
    IVaultFacetDeposit,
    IVaultFacetManagement,
    IVaultFacetPendingWithdrawals,
    IVaultFacetStrategies,
    IVaultFacetWithdraw
{

}
