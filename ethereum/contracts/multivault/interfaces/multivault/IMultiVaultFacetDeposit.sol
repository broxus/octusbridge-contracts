// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "../IEverscale.sol";
import "./IMultiVaultFacetPendingWithdrawals.sol";


interface IMultiVaultFacetDeposit {
    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        address token,
        uint amount
    ) external;

    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        address token,
        uint256 amount,
        uint256 expectedMinBounty,
        IMultiVaultFacetPendingWithdrawals.PendingWithdrawalId[] memory pendingWithdrawalIds
    ) external;
}
