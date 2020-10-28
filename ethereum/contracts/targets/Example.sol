pragma solidity ^0.6.0;


contract TargetExampleState {
    uint currentState = 0;

    event StateChange(
        uint state,
        address author
    );

    function setState(uint newState) public {
        currentState = newState;

        emit StateChange(newState, msg.sender);
    }
}
