// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/SafeMath.sol";
import "./utils/DistributedOwnable.sol";
import "./interfaces/IBridge.sol";


/**
    @title Basic smart contract for implementing Bridge logic.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract Bridge is DistributedOwnable, IBridge {
    using SafeMath for uint;

    mapping(address => bool) relays;

    /**
        @notice Bridge constructor
        @param owners Initial list of owners addresses
    **/
    constructor(
        address[] memory owners
    ) DistributedOwnable(owners) public {}

    function isRelay(address candidate) override public view returns(bool) {
        return isOwner(candidate);
    }
}
