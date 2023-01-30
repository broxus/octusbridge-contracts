// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IWETH.sol";
import "../multivault/interfaces/multivault/IOctusCallback.sol";
import "../multivault/interfaces/multivault/IMultiVaultFacetWithdraw.sol";
import "../multivault/interfaces/multivault/IMultiVaultFacetTokens.sol";
import "../multivault/interfaces/multivault/IMultiVaultFacetPendingWithdrawals.sol";

import "hardhat/console.sol";


contract UnwrapNativeToken is IOctusCallback {
    IWETH wethContract;
    address multiVault;

    mapping(address => mapping(uint => bool)) pendingWithdrawals;

    constructor(address _weth, address _multiVault) {
        wethContract = IWETH(_weth);
        multiVault = _multiVault;
    }

    modifier onlyWithdrawRequestOwner(uint _withdrawRequestId) {
        require(pendingWithdrawals[msg.sender][_withdrawRequestId], "Withdraw id not exists or sender not an owner");
        _;
    }
    modifier onlyMultiVault() {
        require(msg.sender == multiVault, "Only multivault");
        _;
    }

    function setPendingWithdrawalBounty(
        uint256 _id,
        uint256 _bounty
    ) external onlyWithdrawRequestOwner(_id) {
        IMultiVaultFacetPendingWithdrawals(multiVault).setPendingWithdrawalBounty(_id, _bounty);
    }

    function cancelPendingWithdrawal(
        uint256 _id,
        uint256 _amount,
        IEverscale.EverscaleAddress memory _recipient,
        uint _expected_evers,
        bytes memory _payload,
        uint _bounty
    ) external payable onlyWithdrawRequestOwner(_id) {
        IMultiVaultFacetPendingWithdrawals(multiVault).cancelPendingWithdrawal(
            _id,
            _amount,
            _recipient,
            _expected_evers,
            _payload,
            _bounty
        );
    }

    function onAlienWithdrawalPendingCreated(
        IMultiVaultFacetWithdraw.AlienWithdrawalParams memory _payload,
        uint _pendingWithdrawalId
    ) external override onlyMultiVault {
        address nativeTokenReceiver = abi.decode(_payload.callback.payload, (address));
        pendingWithdrawals[nativeTokenReceiver][_pendingWithdrawalId] = true;
    }

    function onAlienWithdrawal(
        IMultiVaultFacetWithdraw.AlienWithdrawalParams memory _payload,
        uint256 withdrawAmount
    ) external override onlyMultiVault {

        address payable nativeTokenReceiver = abi.decode(_payload.callback.payload, (address));

        wethContract.withdraw(withdrawAmount);
        nativeTokenReceiver.transfer(withdrawAmount);
    }

    function onNativeWithdrawal(
        IMultiVaultFacetWithdraw.NativeWithdrawalParams memory _payload
    ) external override onlyMultiVault {}

    receive() external payable {}

}
