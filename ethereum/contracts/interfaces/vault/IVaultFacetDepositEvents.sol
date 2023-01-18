// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


interface IVaultFacetDepositEvents {
    event Deposit(
        uint256 amount,
        int128 wid,
        uint256 addr
    );

    event UserDeposit(
        address sender,
        int128 recipientWid,
        uint256 recipientAddr,
        uint256 amount,
        address withdrawalRecipient,
        uint256 withdrawalId,
        uint256 bounty
    );

    event FactoryDeposit(
        uint128 amount,
        int8 wid,
        uint256 user,
        uint256 creditor,
        uint256 recipient,
        uint128 tokenAmount,
        uint128 tonAmount,
        uint8 swapType,
        uint128 slippageNumerator,
        uint128 slippageDenominator,
        bytes1 separator,
        bytes level3
    );

    event UpdateDepositLimit(uint256 depositLimit);
    event UpdateDepositFee(uint256 fee);
}
