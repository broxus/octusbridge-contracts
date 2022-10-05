// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "../../interfaces/IEverscale.sol";
import "../../interfaces/IERC20Metadata.sol";
import "../../interfaces/multivault/IMultiVaultFacetDepositEvents.sol";

import "../storage/MultiVaultStorage.sol";


abstract contract MultiVaultHelperEverscale is IMultiVaultFacetDepositEvents {
    function _transferToEverscaleNative(
        address _token,
        IEverscale.EverscaleAddress memory recipient,
        uint amount
    ) internal {
        MultiVaultStorage.Storage storage s = MultiVaultStorage._storage();

        IEverscale.EverscaleAddress memory native = s.natives_[_token];

        emit NativeTransfer(
            native.wid,
            native.addr,
            uint128(amount),
            recipient.wid,
            recipient.addr
        );
    }

    function _transferToEverscaleAlien(
        address _token,
        IEverscale.EverscaleAddress memory recipient,
        uint amount
    ) internal {
        emit AlienTransfer(
            block.chainid,
            uint160(_token),
            IERC20Metadata(_token).name(),
            IERC20Metadata(_token).symbol(),
            IERC20Metadata(_token).decimals(),
            uint128(amount),
            recipient.wid,
            recipient.addr
        );
    }
}
