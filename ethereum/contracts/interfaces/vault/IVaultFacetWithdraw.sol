// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "./../IEverscale.sol";
import "./IVaultFacetPendingWithdrawals.sol";

interface IVaultFacetWithdraw {
    struct WithdrawalParams {
        IEverscale.EverscaleAddress sender;
        uint256 amount;
        address recipient;
        uint32 chainId;
    }

    function decodeWithdrawalEventData(
        bytes memory eventData
    ) external view returns(WithdrawalParams memory);

    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures
    ) external returns (
        bool instantWithdrawal,
        IVaultFacetPendingWithdrawals.PendingWithdrawalId memory pendingWithdrawalId
    );

    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures,
        uint bounty
    ) external;

    function withdrawalIds(bytes32) external view returns (bool);

    function withdrawFee() external view returns (uint256);
    function setWithdrawFee(uint _withdrawFee) external;

    function withdraw(
        uint256 id,
        uint256 amountRequested,
        address recipient,
        uint256 maxLoss,
        uint bounty
    ) external returns(uint256);

    event InstantWithdrawal(
        bytes32 payloadId,
        address recipient,
        uint256 amount
    );
}
