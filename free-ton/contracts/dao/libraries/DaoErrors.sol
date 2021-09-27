pragma ton-solidity >= 0.39.0;

library DaoErrors {
    uint8 constant NOT_ADMIN = 101;
    uint8 constant NOT_PENDING_ADMIN = 102;
    uint8 constant NOT_PROPOSAL = 105;
    uint8 constant NOT_ACCOUNT = 106;
    uint8 constant NOT_OWNER = 108;

    uint8 constant TOO_MANY_ACTIONS = 110;
    uint8 constant ACTIONS_MUST_BE_PROVIDED = 111;
    uint8 constant MSG_VALUE_TOO_LOW_TO_CREATE_PROPOSAL = 112;
    uint8 constant DESCRIPTION_TOO_LONG = 113;

    uint8 constant WRONG_VOTING_PERIOD = 120;
    uint8 constant WRONG_VOTING_DELAY = 121;
    uint8 constant WRONG_TIME_LOCK = 122;
    uint8 constant WRONG_THRESHOLD = 123;
    uint8 constant WRONG_QUORUM = 124;
    uint8 constant WRONG_GRACE_PERIOD = 125;

    uint8 constant VALUE_TOO_LOW = 130;

    uint8 constant PROPOSAL_IS_NOT_SUCCEEDED = 140;
    uint8 constant PROPOSAL_IS_NOT_QUEUED = 141;
    uint8 constant PROPOSAL_IS_EXECUTED = 142;
    uint8 constant EXECUTION_TIME_NOT_COME_YET = 143;


}
