// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;


interface IBridge {
    struct BridgeConfiguration {
        uint32 requiredSignatures;
    }

    struct TONEvent {
        uint256 eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        bytes eventData;
        int8 tonEventConfigurationWid;
        uint256 tonEventConfigurationAddress;
        uint16 requiredConfirmations;
        uint16 requiredRejects;
        address proxy;
        uint32 round;
        uint32 chainId;
    }

    function isRelay(uint32 round, address candidate) external view returns(bool);

    function verifyRelaySignatures(
        uint32 round,
        bytes memory payload,
        bytes[] memory signatures
    ) external view returns(bool);

    function setRoundRelays(
        uint32 round,
        address[] calldata relays
    ) external;

    function setConfiguration(BridgeConfiguration calldata _configuration) external;

    event RoundRelayGranted(uint32 indexed round, address indexed relay);
    event ConfigurationUpdate(BridgeConfiguration configuration);
}
