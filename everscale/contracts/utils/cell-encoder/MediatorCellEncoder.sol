pragma ton-solidity >= 0.39.0;

import "../../bridge/interfaces/multivault/IEVMCallback.sol";


contract MediatorCellEncoder is IEVMCallback {
    function encodeAlienHiddenBridgeEventPayload(
        address proxy,
        TvmCell burnPayload
    ) external pure returns(TvmCell) {
        return abi.encode(proxy, burnPayload);
    }
}
