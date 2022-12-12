pragma ton-solidity >= 0.39.0;

import "../../bridge/interfaces/multivault/proxy/alien/IProxyMultiVaultAlien_V4.sol";


contract MergePoolCellEncoder {
    function encodeMergePoolBurnSwapPayload(
        address targetToken
    ) public pure returns (TvmCell) {
        TvmCell empty;

        return abi.encode(
            uint8(1),
            targetToken,
            empty
        );
    }

    function encodeMergePoolBurnWithdrawPayload(
        address targetToken,
        uint160 recipient,
        IProxyMultiVaultAlien_V4.EVMCallback callback
    ) public pure returns (TvmCell) {
        TvmCell operationPayload = abi.encode(recipient, callback);

        return abi.encode(
            uint8(0),
            targetToken,
            operationPayload
        );
    }
}
