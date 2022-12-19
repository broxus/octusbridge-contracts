pragma ton-solidity >= 0.39.0;

import "../../bridge/interfaces/multivault/IEVMCallback.sol";


contract MediatorCellEncoder is IEVMCallback {
    function encodeAlienHiddenBridgeEventPayload(
        uint8 operation,
        address proxy,
        TvmCell payload
    ) external pure returns(TvmCell) {
        return abi.encode(operation, proxy, payload);
    }
}
