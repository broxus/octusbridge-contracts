

contract Storage {
    bytes public state;

    event StateUpdate(bytes state);

    function setState(bytes _state) public {
        state = _state;

        emit StateUpdate(_state);
    }
}
