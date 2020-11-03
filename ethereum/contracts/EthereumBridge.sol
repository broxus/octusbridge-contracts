// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./libraries/SafeMath.sol";
import "./DistributedOwnable.sol";


/**
    @title Basic smart contract for implementing Bridge logic.
    @dev Uses DistributedOwnable contract as identity and access management solution
**/
contract EthereumBridge is DistributedOwnable {
    using SafeMath for uint;

    mapping(uint => bool) receiptUsed;

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

    /**
        @notice Check that the specific receipt was used.
        @param receiptID - Unique ID of the reveal receipt
        @return Boolean status of usage
    */
    function isReceiptUsed(uint receiptID) public view returns(bool) {
        return receiptUsed[receiptID];
    }


    /**
        @notice Execute arbitrary call by providing the list of signatures
        @param receipt - ABI encoded payload
        @param signatures - List of signatures for receipt
    */
    function executeTargetCall(
        bytes memory receipt,
        bytes[] memory signatures
    ) public enoughOwnersSigned(
        receipt,
        signatures,
        requiredOwnersToExecuteCall
    ) {
        // Decode the receipt
        (
            address target,
            bytes memory callData,
            uint receiptID
        ) = abi.decode(receipt, (address, bytes, uint));

        // Check that the receipt ID is not used
        require(!isReceiptUsed(receiptID), "Receipt ID already used");

        // Execute the call
        (bool success, ) = target.call(callData);
        require(success, "Receipt call failed");

        // Store receipt ID
        receiptUsed[receiptID] = true;
    }
}
