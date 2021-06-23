// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./interfaces/IBridge.sol";
import "./interfaces/IDAO.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


/*
    @title DAO contract for Broxus TON-Ethereum bridge
    Executes proposals confirmed in TON DAO. Owns itself.
*/
contract DAO is OwnableUpgradeable, IDAO {
    address public bridge;

    mapping (bytes32 => bool) public executed;

    modifier notExecutedBefore(bytes memory payload) {
        bytes32 payloadHash = keccak256(abi.encode(payload));

        require(executed[payloadHash] == false, "DAO: already executed");

        _;

        executed[payloadHash] = true;
    }

    function initialize(
        address _bridge
    ) public initializer {
        bridge = _bridge;

        __Ownable_init();
        transferOwnership(address(this));
    }

    function updateBridge(
        address _bridge
    ) override external onlyOwner {
        bridge = _bridge;
    }

    /*
        @notice Execute signed payload
        @param payload Encoded TON event with payload details
        @param signatures Payload signatures
    */
    function execute(
        bytes calldata payload,
        bytes[] calldata signatures
    ) override external notExecutedBefore(payload) returns(
        bytes[] memory responses
    ){
        (IBridge.TONEvent memory tonEvent) = abi.decode(payload, (IBridge.TONEvent));

        require(
            IBridge(bridge).verifyRelaySignatures(
                tonEvent.round,
                payload,
                signatures
            ),
            "DAO: signatures verification failed"
        );

        require(
            tonEvent.proxy == address(this),
            "DAO: wrong event proxy"
        );

        require(
            tonEvent.chainId == 1,
            "DAO: wrong chain id"
        );

        (EthAction[] memory actions) = abi.decode(
            tonEvent.eventData,
            (EthAction[])
        );

        responses = new bytes[](actions.length);

        for (uint i=0; i<actions.length; i++) {
            EthAction memory action = actions[i];

            bytes memory callData;

            if (bytes(action.signature).length == 0) {
                callData = action.data;
            } else {
                callData = abi.encodePacked(
                    bytes4(keccak256(bytes(action.signature))),
                    action.data
                );
            }

            (bool success, bytes memory response) = address(action.target)
                .call{value: action.value}(callData);

            require(success, "DAO: execution fail");

            responses[i] = response;
        }
    }
}
