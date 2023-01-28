// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IWETH.sol";
import "../multivault/interfaces/multivault/IOctusCallback.sol";
import "../multivault/interfaces/multivault/IMultiVaultFacetWithdraw.sol";
import "../multivault/interfaces/multivault/IMultiVaultFacetTokens.sol";
import "hardhat/console.sol";


contract UnwrapNativeToken is IOctusCallback {
    IWETH wethContract;
    IMultiVaultFacetTokens multiVaultContract;

    constructor(address _weth, address _multiVault) {
        wethContract = IWETH(_weth);
        multiVaultContract = IMultiVaultFacetTokens(_multiVault);
    }

    function onNativeWithdrawal(IMultiVaultFacetWithdraw.NativeWithdrawalParams memory _payload) external override {}

    function onAlienWithdrawal(IMultiVaultFacetWithdraw.AlienWithdrawalParams memory _payload) external override {

        address payable nativeTokenReceiver = abi.decode(_payload.callback.payload, (address));
        IMultiVaultFacetTokens.Token memory wethToken = multiVaultContract.tokens(address(wethContract));
        uint256 amountWithoutFee = _payload.amount - _payload.amount * wethToken.withdrawFee / 10000;

        wethContract.withdraw(amountWithoutFee);

        nativeTokenReceiver.transfer(amountWithoutFee);
    }

    receive() external payable {}

    function onAlienWithdrawalPendingCreated(IMultiVaultFacetWithdraw.AlienWithdrawalParams memory _payload) external override {}
}
