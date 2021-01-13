// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./../interfaces/IBridge.sol";
import "./../interfaces/IProxy.sol";


/**
    @notice Basic example of the Event contract
    @dev Emits StateChange(uint,address) event each time someone calls the setStateToTON method
    @dev Allows to transfer event from TON by processing the payload and
**/
contract ProxySimple is IProxy {
    uint public state = 0;

    address public bridge;

    event EthereumStateChange(uint state);
    event TONStateChange(uint state);

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function setStateToTON(uint _state) public {
        _setState(_state);

        emit EthereumStateChange(_state);
    }

    function broxusBridgeCallback(
        bytes memory payload,
        bytes[] memory signatures
    ) public {
        require(
            IBridge(bridge).countRelaysSignatures(
                payload,
                signatures
            ) >= 2,
            'Not enough relays signed'
        );

        (TONEvent memory _event) = abi.decode(
            payload,
            (TONEvent)
        );

        (uint _state) = abi.decode(
            _event.eventData,
            (uint)
        );

        _setState(_state);

        emit TONStateChange(_state);
    }

    function _setState(uint _state) internal {
        state = _state;
    }
}
