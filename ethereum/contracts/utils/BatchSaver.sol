// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "./../interfaces/multivault/IMultiVaultFacetWithdraw.sol";


interface ISwapContract {
    function saveWithdrawAlien(
        bytes memory payload,
        bytes[] memory signatures
    ) external;
}


contract BatchSaver {
    address immutable public swapContract;
    address immutable public multivault;

    constructor(
        address _swapContract,
        address _multivault
    ) {
        swapContract = _swapContract;
        multivault = _multivault;
    }

    event WithdrawalAlreadyUsed(bytes32 indexed withdrawalId);
    event WithdrawalSaved(bytes32 indexed withdrawalId);

    struct Withdraw {
        bool isNative;
        bytes payload;
        bytes[] signatures;
        bool isCrossSwap;
    }

    function checkWithdrawalAlreadySeen(bytes32 withdrawalId) public view returns (bool) {
        return IMultiVaultFacetWithdraw(multivault).withdrawalIds(withdrawalId);
    }

    function saveWithdrawals(
        Withdraw[] memory withdrawals
    ) external {
        for (uint i = 0; i < withdrawals.length; i++) {
            Withdraw memory withdraw = withdrawals[i];

            bytes32 withdrawalId = keccak256(withdraw.payload);

            if (checkWithdrawalAlreadySeen(withdrawalId)) {
                emit WithdrawalAlreadyUsed(withdrawalId);

                continue;
            }

            if (withdraw.isCrossSwap) {
                ISwapContract(swapContract).saveWithdrawAlien(
                    withdraw.payload,
                    withdraw.signatures
                );
            } else {
                if (withdraw.isNative) {
                    IMultiVaultFacetWithdraw(multivault).saveWithdrawNative(
                        withdraw.payload,
                        withdraw.signatures
                    );
                } else {
                    IMultiVaultFacetWithdraw(multivault).saveWithdrawAlien(
                        withdraw.payload,
                        withdraw.signatures
                    );
                }
            }

            emit WithdrawalSaved(withdrawalId);
        }
    }
}
