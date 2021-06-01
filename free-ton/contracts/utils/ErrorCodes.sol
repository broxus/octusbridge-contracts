pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


library ErrorCodes {
    // Bridge
    uint16 constant BRIDGE_NOT_ACTIVE = 2102;
    uint16 constant EVENT_CONFIGURATION_NOT_ACTIVE = 2103;
    uint16 constant EVENT_CONFIGURATION_NOT_EXISTS = 2105;
    uint16 constant EVENT_CONFIGURATION_ALREADY_EXISTS = 2106;
    uint16 constant SENDER_NOT_STAKING = 2107;

    // Event configuration contract
    uint16 constant SENDER_NOT_BRIDGE = 2109;
    uint16 constant EVENT_BLOCK_NUMBER_LESS_THAN_START = 2110;
    uint16 constant EVENT_TIMESTAMP_LESS_THAN_START = 2111;

    // Event contract
    uint16 constant EVENT_NOT_PENDING = 2112;
    uint16 constant SENDER_NOT_EVENT_CONFIGURATION = 2113;
    uint16 constant KEY_ALREADY_CONFIRMED = 2114;
    uint16 constant KEY_ALREADY_REJECTED = 2115;
    uint16 constant EVENT_NOT_CONFIRMED = 2116;
    uint16 constant TOO_LOW_MSG_VALUE = 2117;
}
