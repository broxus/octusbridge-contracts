// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/SafeMath.sol";
import "./utils/DistributedOwnable.sol";


/**
    @title Basic smart contract for implementing Bridge logic.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract EthereumBridge is DistributedOwnable {
    using SafeMath for uint;

    /**
        @notice Bridge constructor
        @param owners Initial list of owners addresses
        @param initialRequiredOwnersToExecuteCall Initial amount of owners required to execute call
        @param initialRequiredOwnersToUpdateOwners Initial amount of owners required to update owners set
    **/
    constructor(
        address[] memory owners,
        uint initialRequiredOwnersToExecuteCall,
        uint initialRequiredOwnersToUpdateOwners
    ) DistributedOwnable(
        owners,
        initialRequiredOwnersToExecuteCall,
        initialRequiredOwnersToUpdateOwners
    ) public {}

    function updateOwnership(bytes payload, bytes[] signatures) public {

    }

    function updateConfiguration(bytes payload, bytes[] signatures) public {

    }
}
