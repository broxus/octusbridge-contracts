// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;


import "./../interfaces/IBridge.sol";


contract Decoder {
    struct VyperTonEvent {
        uint256 eventTransactionLt;
        uint256 eventTimestamp;
        bytes eventData;
        int128 configurationWid;
        uint256 configurationAddress;
        address proxy;
        uint256 round;
    }

    function decodeWithdrawTonEvent(
        bytes calldata payload
    )
        pure
        external
    returns (
        VyperTonEvent memory vyperTonEvent
    ) {
        (IBridge.TONEvent memory tonEvent) = abi.decode(payload, (IBridge.TONEvent));

        vyperTonEvent.eventTransactionLt = uint256(tonEvent.eventTransactionLt);
        vyperTonEvent.eventTimestamp = uint256(tonEvent.eventTimestamp);
        vyperTonEvent.eventData = tonEvent.eventData;
        vyperTonEvent.configurationWid = int128(tonEvent.configurationWid);
        vyperTonEvent.configurationAddress = uint256(tonEvent.configurationAddress);
        vyperTonEvent.proxy = tonEvent.proxy;
        vyperTonEvent.round = uint256(tonEvent.round);

        return vyperTonEvent;
    }
}
