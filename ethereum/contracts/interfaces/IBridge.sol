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
    }

    function isRelay(uint32 round, address candidate) external view returns(bool);

    function countRelaySignatures(
        uint32 round,
        bytes memory payload,
        bytes[] memory signatures
    ) external view returns(uint32 count);

    function setRoundRelays(
        bytes calldata payload,
        bytes[] calldata signatures
    ) external;

    function removeRoundRelays(
        bytes calldata payload,
        bytes[] calldata signatures
    ) external;

    function setConfiguration(BridgeConfiguration calldata _configuration) external;

    event RoundRelaysUpdate(uint32 indexed round, address[] relays, bool indexed status);
    event ConfigurationUpdate(BridgeConfiguration configuration);
}
