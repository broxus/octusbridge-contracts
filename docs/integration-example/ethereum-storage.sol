

contract Storage {
    bytes memory public state;

    event StateUpdate(bytes memory state);

    function setState(bytes memory _state) public {
        state = _state;

        emit StateUpdate(_state);
    }
}
