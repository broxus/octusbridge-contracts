pragma solidity ^0.7.0;

contract Storage {
    bytes memory public state;

    event StateUpdate(bytes memory state);

    function _setState(bytes memory _state) internal {
        state = _state;
    }

    function setStateByBridge(bytes memory _state) public {
        _setState(_state);
    }

    function setState(bytes memory _state) public {
        _setState(_state);

        emit StateUpdate(_state);
    }
}
