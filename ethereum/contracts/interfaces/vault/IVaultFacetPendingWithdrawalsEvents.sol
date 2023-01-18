// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./IVaultFacetPendingWithdrawals.sol";


interface IVaultFacetPendingWithdrawalsEvents {
    event UpdateWithdrawLimitPerPeriod(uint256 withdrawLimitPerPeriod);
    event UpdateUndeclaredWithdrawLimit(uint256 undeclaredWithdrawLimit);

    event PendingWithdrawalUpdateBounty(address recipient, uint256 id, uint256 bounty);
    event PendingWithdrawalCancel(address recipient, uint256 id, uint256 amount);
    event PendingWithdrawalForce(address recipient, uint256 id);
    event PendingWithdrawalCreated(
        address recipient,
        uint256 id,
        uint256 amount,
        bytes32 payloadId
    );
    event PendingWithdrawalWithdraw(
        address recipient,
        uint256 id,
        uint256 requestedAmount,
        uint256 redeemedAmount
    );
    event PendingWithdrawalUpdateApproveStatus(
        address recipient,
        uint256 id,
        IVaultFacetPendingWithdrawals.ApproveStatus approveStatus
    );
}
