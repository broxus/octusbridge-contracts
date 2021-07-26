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
    }

    /// @dev Answers if specific address was relay in specific round
    /// @param round Round id
    /// @param candidate Address to check
    function isRelay(uint32 round, address candidate) external view returns(bool);

    function isBanned(address candidate) external view returns(bool);

    /// @dev Check that the provided signatures is correct.
    /// @dev Checks that there are enough authorized signers for specified round
    /// @param round Round id
    /// @param payload Arbitrary payload
    /// @param signatures Array of payload signatures
    function verifyRelaySignatures(
        uint32 round,
        bytes memory payload,
        bytes[] memory signatures
    ) external view returns(bool);

    function setRoundRelays(
        bytes calldata payload,
        bytes[] calldata signatures
    ) external;

    function banRelays(
        address[] calldata relays
    ) external;

    function setConfiguration(BridgeConfiguration calldata _configuration) external;

    /// @dev Relay permission granted
    /// @param round Round id
    /// @param relay Relay address
    event RoundRelayGranted(uint32 indexed round, address indexed relay);

    /// @dev Relays banned
    /// @param relay Relay address
    event RelayBanned(address indexed relay);

    /// @dev Configuration updated
    /// @param configuration Bridge configuration
    event ConfigurationUpdate(BridgeConfiguration configuration);
}
