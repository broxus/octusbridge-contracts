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
        int8 configurationWid;
        uint256 configurationAddress;
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
        bytes calldata payload,
        bytes[] calldata signatures
    ) external;

    function setConfiguration(BridgeConfiguration calldata _configuration) external;

    event RoundRelayGranted(uint32 indexed round, address indexed relay);
    event ConfigurationUpdate(BridgeConfiguration configuration);
}
