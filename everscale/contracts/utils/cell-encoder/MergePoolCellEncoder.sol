pragma ton-solidity >= 0.39.0;


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
        uint160 recipient
    ) public pure returns (TvmCell) {
        TvmCell operationPayload = abi.encode(recipient);

        return abi.encode(
            uint8(0),
            targetToken,
            operationPayload
        );
    }
}
