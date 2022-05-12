pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


// TODO: remove unused codes before release
library ErrorCodes {
    // Bridge
    uint16 constant BRIDGE_NOT_ACTIVE = 2102;
    uint16 constant EVENT_CONFIGURATION_NOT_ACTIVE = 2103;
    uint16 constant EVENT_CONFIGURATION_NOT_EXISTS = 2105;
    uint16 constant EVENT_CONFIGURATION_ALREADY_EXISTS = 2106;
    uint16 constant SENDER_NOT_STAKING = 2107;
    uint16 constant BRIDGE_PAUSED = 2108;
    uint16 constant IS_NOT_BASE_CHAIN = 2109;
    uint16 constant SENDER_NOT_RELAY_ROUND = 2110;
    uint16 constant SENDER_NOT_MANAGER_OR_OWNER = 2111;

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
    uint16 constant SENDER_IS_NOT_EVENT_EMITTER = 2220;

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
    uint16 constant EVENT_NOT_INITIALIZING = 2321;
    uint16 constant SENDER_IS_NOT_EVENT_OWNER = 2322;
    uint16 constant WRONG_VOTE_RECEIVER = 2323;
    uint16 constant WRONG_STATUS = 2324;

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
    uint16 constant LOW_RELAY_DEPOSIT = 2533;
    uint16 constant LOW_VERSION = 2534;
    uint16 constant LOW_TOKEN_BALANCE = 2535;
    uint16 constant RELAY_LOCK_ACTIVE = 2536;
    uint16 constant CANT_WITHDRAW_VOTES = 2537;
    uint16 constant RELAY_NOT_EXIST = 2538;
    uint16 constant DUPLICATE_RELAY = 2539;
    uint16 constant DUPLICATE_CALL = 2540;
    uint16 constant LOW_BALANCE = 2541;
    uint16 constant NOT_RESCUER = 2542;
    uint16 constant EMERGENCY = 2543;

    // staking dao
    uint16 constant NOT_DAO_ROOT = 2601;
    uint16 constant NOT_PROPOSAL = 2602;
    uint16 constant WRONG_PROPOSAL_ID = 2603;
    uint16 constant ALREADY_VOTED = 2604;
    uint16 constant REASON_IS_TOO_LONG = 2605;
    uint16 constant PROPOSAL_IS_NOT_ACTIVE = 2606;
    uint16 constant OLD_VERSION = 2607;
    uint16 constant WRONG_PROPOSAL_STATE = 2608;

    // Proxy Token Transfer
    uint16 constant NOT_ETHEREUM_CONFIG = 2701;
    uint16 constant PROXY_PAUSED = 2702;
    uint16 constant PROXY_TOKEN_ROOT_IS_EMPTY = 2703;
    uint16 constant WRONG_TOKENS_AMOUNT_IN_PAYLOAD = 2704;
    uint16 constant WRONG_OWNER_IN_PAYLOAD = 2705;
    uint16 constant NOT_LEGACY_BURN = 2706;

}
