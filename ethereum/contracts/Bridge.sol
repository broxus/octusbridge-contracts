// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/SafeMath.sol";
import "./utils/DistributedOwnable.sol";
import "./interfaces/IBridge.sol";


/**
    @title Ethereum Bridge main contract.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract EthereumBridge is DistributedOwnable, IBridge {
    using SafeMath for uint;

    /**
        @notice Bridge constructor
        @param owners Initial list of owners addresses
    **/
    constructor(
        address[] memory owners
    ) DistributedOwnable(owners) public {}

//    function updateOwnership(bytes memory payload, bytes[] memory signatures) public {
//
//    }
//
//    function updateConfiguration(bytes memory payload, bytes[] memory signatures) public {
//
//    }

    function isRelay(address candidate) public view override returns(bool) {
        return isOwner(candidate);
    }
}
