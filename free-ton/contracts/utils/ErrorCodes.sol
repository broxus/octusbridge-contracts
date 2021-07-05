pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


// TODO: remove unused codes before release
library ErrorCodes {
    // Bridge
    uint16 constant BRIDGE_NOT_ACTIVE = 2102;
    uint16 constant EVENT_CONFIGURATION_NOT_ACTIVE = 2103;
    uint16 constant EVENT_CONFIGURATION_NOT_EXISTS = 2105;
    uint16 constant EVENT_CONFIGURATION_ALREADY_EXISTS = 2106;
    uint16 constant SENDER_NOT_STAKING = 2107;

    // Event configuration contract
    uint16 constant SENDER_NOT_BRIDGE = 2209;
    uint16 constant EVENT_BLOCK_NUMBER_LESS_THAN_START = 2210;
    uint16 constant EVENT_TIMESTAMP_LESS_THAN_START = 2211;
    uint16 constant SENDER_NOT_EVENT_CONTRACT = 2212;
    uint16 constant TOO_LOW_DEPLOY_VALUE = 2213;

    // Event contract
    uint16 constant EVENT_NOT_PENDING = 2312;
    uint16 constant SENDER_NOT_EVENT_CONFIGURATION = 2313;
    uint16 constant KEY_ALREADY_CONFIRMED = 2314;
    uint16 constant KEY_ALREADY_REJECTED = 2315;
    uint16 constant EVENT_NOT_CONFIRMED = 2316;
    uint16 constant TOO_LOW_MSG_VALUE = 2317;
    uint16 constant KEY_VOTE_NOT_EMPTY = 2318;
    uint16 constant SENDER_NOT_INITIALIZER = 2319;
    uint16 constant EVENT_PENDING = 2320;

    // Connector
    uint16 constant DEPLOYER_NOT_BRIDGE = 2420;
}
