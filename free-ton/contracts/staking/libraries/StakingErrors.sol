pragma ton-solidity ^0.39.0;

library StakingErrors {
    uint8 public constant NOT_OWNER = 101;
    uint8 public constant NOT_ROOT = 102;
    uint8 public constant NOT_TOKEN_WALLET = 103;
    uint8 public constant NOT_USER_DATA = 104;
    uint8 public constant INTERNAL_ADDRESS = 105;
    uint8 public constant ZERO_AMOUNT_INPUT = 106;
    uint8 public constant TOO_EARLY_FOR_ELECTION = 107;
    uint8 public constant ELECTION_ALREADY_STARTED = 108;
    uint8 public constant NOT_ELECTION = 109;
    uint8 public constant PLATFORM_CODE_NON_EMPTY = 110;
    uint8 public constant VALUE_TOO_LOW = 111;
    uint8 public constant INVALID_ELECTION_ROUND = 112;
    uint8 public constant INVALID_RELAY_ROUND_ROUND = 113;
    uint8 public constant NOT_ACTIVE = 114;
    uint8 public constant NOT_RELAY_ROUND = 115;
    uint8 public constant RELAY_ROUND_INITIALIZED = 116;
    uint8 public constant ELECTION_NOT_STARTED = 117;
    uint8 public constant BAD_RELAY_MEMBERSHIP_REQUEST = 118;
    uint8 public constant CANT_END_ELECTION = 119;
    uint8 public constant ELECTION_ENDED = 120;
    uint8 public constant ORIGIN_ROUND_ALREADY_INITIALIZED = 121;
    uint8 public constant ORIGIN_ROUND_NOT_INITIALIZED = 122;
    uint8 public constant ACCOUNT_NOT_LINKED = 123;
    uint8 public constant ACCOUNT_ALREADY_CONFIRMED = 124;
    uint8 public constant ACCOUNT_NOT_CONFIRMED = 124;
    uint8 public constant NOT_BRIDGE = 125;
    uint8 public constant EMPTY_REWARD_ROUND = 126;

    uint16 constant NOT_DAO_ROOT = 201;
    uint16 constant NOT_PROPOSAL = 202;
    uint16 constant WRONG_PROPOSAL_ID = 203;
    uint16 constant ALREADY_VOTED = 204;
    uint16 constant REASON_IS_TOO_LONG = 205;
}
