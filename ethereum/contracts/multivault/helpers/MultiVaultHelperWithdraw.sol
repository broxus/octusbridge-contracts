// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


import "../../interfaces/IEverscale.sol";
import "../../interfaces/bridge/IBridge.sol";
import "../../interfaces/multivault/IMultiVaultFacetTokens.sol";
import "../../interfaces/multivault/IMultiVaultFacetWithdrawEvents.sol";

import "../../interfaces/IMultiVaultToken.sol";
import "../storage/MultiVaultStorage.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


abstract contract MultiVaultHelperWithdraw is IMultiVaultFacetWithdrawEvents {
    using SafeERC20 for IERC20;

    modifier withdrawalNotSeenBefore(bytes memory payload) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        bytes32 withdrawalId = keccak256(payload);

        require(!s.withdrawalIds[withdrawalId], "Withdraw: already seen");
        s.withdrawalIds[withdrawalId] = true;

        _;
    }

    function _processWithdrawEvent(
        bytes memory payload,
        bytes[] memory signatures,
        IEverscale.EverscaleAddress memory configuration
    ) internal view returns (IEverscale.EverscaleEvent memory) {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        require(
            IBridge(s.bridge).verifySignedEverscaleEvent(payload, signatures) == 0
        );

        // Decode Everscale event
        (IEverscale.EverscaleEvent memory _event) = abi.decode(payload, (IEverscale.EverscaleEvent));

        require(
            _event.configurationWid == configuration.wid &&
            _event.configurationAddress == configuration.addr,
            "Withdraw: invalid configuration"
        );

        return _event;
    }

    function _withdraw(
        address recipient,
        uint amount,
        uint fee,
        IMultiVaultFacetTokens.TokenType tokenType,
        bytes32 payloadId,
        address token
    ) internal {
        emit Withdraw(
            tokenType,
            payloadId,
            token,
            recipient,
            amount,
            fee
        );
        if (tokenType == IMultiVaultFacetTokens.TokenType.Native) {
            IMultiVaultToken(token).mint(recipient, amount - fee);
        } else {
            IERC20(token).safeTransfer(recipient, amount - fee);
        }
    }
}
