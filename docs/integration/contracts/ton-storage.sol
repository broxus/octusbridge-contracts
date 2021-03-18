pragma solidity >= 0.6.0;

contract Storage {
    bytes public state;

    event StateUpdate(bytes state);

    function _setState(bytes memory _state) internal {
        state = _state;
    }

    function setState(bytes _state) public {
        state = _state;

        emit StateUpdate(_state);
    }
}
