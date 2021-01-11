// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


/**
    @notice Basic example of the Event contract
    @dev Emits StateChange(uint,address) event each time someone calls the setStateToTON method
    @dev Allows to transfer event from TON by processing the payload and
**/
contract EventContractSimple {
    uint public state = 0;

    event EthereumStateChange(uint state);
    event TONStateChange(uint state);

    function setStateToTON(uint _state) public {
        _setState(_state);

        emit EthereumStateChange(_state);
    }

    function setStateFromTON(bytes memory payload, bytes[] memory signature) public {
        // Check signatures validity and sufficiency with Bridge contract
        require(signature.length > 0);

        // Decode and update state
        (uint _state) = abi.decode(payload, (uint));
        _setState(_state);

        emit TONStateChange(_state);
    }

    function _setState(uint _state) internal {
        state = _state;
    }
}
