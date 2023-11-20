// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "./IMultiVaultFacetTokens.sol";


interface IMultiVaultFacetWithdrawEvents {
    event Withdraw(
        IMultiVaultFacetTokens.TokenType _type,
        bytes32 payloadId,
        address token,
        address recipient,
        uint256 amount,
        uint256 fee
    );
}
