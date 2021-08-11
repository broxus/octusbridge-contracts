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
    uint16 constant EVENT_BLOCK_NUMBER_HIGHER_THAN_END = 2214;
    uint16 constant EVENT_TIMESTAMP_HIGHER_THAN_END = 2215;
    uint16 constant TOO_LOW_END_TIMESTAMP = 2216;
    uint16 constant TOO_LOW_END_BLOCK_NUMBER = 2217;
    uint16 constant END_TIMESTAMP_ALREADY_SET = 2218;
    uint16 constant END_BLOCK_NUMBER_ALREADY_SET = 2219;

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

    // staking
    uint16 constant NOT_ADMIN = 2501;
    uint16 constant NOT_ROOT = 2502;
    uint16 constant NOT_TOKEN_WALLET = 2503;
    uint16 constant NOT_USER_DATA = 2504;
    uint16 constant INTERNAL_ADDRESS = 2505;
    uint16 constant ZERO_AMOUNT_INPUT = 2506;
    uint16 constant TOO_EARLY_FOR_ELECTION = 2507;
    uint16 constant ELECTION_ALREADY_STARTED = 2508;
    uint16 constant NOT_ELECTION = 2509;
    uint16 constant PLATFORM_CODE_NON_EMPTY = 2510;
    uint16 constant VALUE_TOO_LOW = 2511;
    uint16 constant INVALID_ELECTION_ROUND = 2512;
    uint16 constant INVALID_RELAY_ROUND_ROUND = 2513;
    uint16 constant NOT_ACTIVE = 2514;
    uint16 constant NOT_RELAY_ROUND = 2515;
    uint16 constant RELAY_ROUND_INITIALIZED = 2516;
    uint16 constant ELECTION_NOT_STARTED = 2517;
    uint16 constant BAD_RELAY_MEMBERSHIP_REQUEST = 2518;
    uint16 constant CANT_END_ELECTION = 2519;
    uint16 constant ELECTION_ENDED = 2520;
    uint16 constant ORIGIN_ROUND_ALREADY_INITIALIZED = 2521;
    uint16 constant ORIGIN_ROUND_NOT_INITIALIZED = 2522;
    uint16 constant ACCOUNT_NOT_LINKED = 2523;
    uint16 constant ACCOUNT_ALREADY_CONFIRMED = 2524;
    uint16 constant ACCOUNT_NOT_CONFIRMED = 2524;
    uint16 constant NOT_BRIDGE = 2525;
    uint16 constant EMPTY_REWARD_ROUND = 2526;
    uint16 constant RELAY_ROUND_NOT_ENDED = 2527;
    uint16 constant RELAY_REWARD_CLAIMED = 2528;
    uint16 constant SLASHED = 2529;
    uint16 constant NOT_REWARDER = 2530;
    uint16 constant BAD_INPUT_ARRAYS = 2531;
    uint16 constant BAD_SENDER = 2532;

    // staking dao
    uint16 constant NOT_DAO_ROOT = 2601;
    uint16 constant NOT_PROPOSAL = 2602;
    uint16 constant WRONG_PROPOSAL_ID = 2603;
    uint16 constant ALREADY_VOTED = 2604;
    uint16 constant REASON_IS_TOO_LONG = 2605;
    uint16 constant PROPOSAL_IS_NOT_ACTIVE = 2606;
    uint16 constant OLD_VERSION = 2607;
    uint16 constant WRONG_PROPOSAL_STATE = 2608;
}
