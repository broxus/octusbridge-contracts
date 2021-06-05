pragma ton-solidity ^0.39.0;

library StakingErrors {
    uint8 public constant NOT_OWNER = 101;
    uint8 public constant NOT_ROOT = 102;
    uint8 public constant NOT_TOKEN_WALLET = 103;
    uint8 public constant NOT_USER_DATA = 104;
    uint8 public constant EXTERNAL_CALL = 105;
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
}
