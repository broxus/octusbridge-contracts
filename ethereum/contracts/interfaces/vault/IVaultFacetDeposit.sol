// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../IEverscale.sol";
import "./IVaultFacetPendingWithdrawals.sol";


interface IVaultFacetDeposit {
    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        uint256 amount
    ) external;

    function deposit(
        IEverscale.EverscaleAddress memory recipient,
        uint256 amount,
        uint256 expectedMinBounty,
        IVaultFacetPendingWithdrawals.PendingWithdrawalId[] memory pendingWithdrawalId
    ) external;

//    function depositToFactory(
//        uint128 amount,
//        int8 wid,
//        uint256 user,
//        uint256 creditor,
//        uint256 recipient,
//        uint128 tokenAmount,
//        uint128 tonAmount,
//        uint8 swapType,
//        uint128 slippageNumerator,
//        uint128 slippageDenominator,
//        bytes memory level3
//    ) external;

    function depositFee() external view returns (uint256);
    function setDepositFee(uint _depositFee) external;

    function depositLimit() external view returns (uint256);
    function availableDepositLimit() external view returns (uint256);
    function setDepositLimit(uint256 limit) external;
}
