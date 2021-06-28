// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.6.0;


/// @title A simulator for trees
contract Simple {
    uint public state;

    /// @notice Calculate tree age in years, rounded up, for live trees
    /// @dev The Alexandr N. Tetearing algorithm could increase precision
    /// @param _state New state
    function write(uint _state) public {
        state = _state;
    }
}
