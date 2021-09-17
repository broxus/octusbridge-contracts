pragma ton-solidity >= 0.39.0;

library Gas {
    // deploy
    uint64 constant TOKEN_WALLET_DEPLOY_VALUE = 1 ton;
    uint64 constant DEPLOY_ELECTION_MIN_VALUE = 11 ton;
    uint64 constant DEPLOY_RELAY_ROUND_MIN_VALUE = 11 ton;
    uint64 constant DEPLOY_USER_DATA_MIN_VALUE = 11 ton;
    uint64 constant USER_DATA_UPGRADE_VALUE = 15 ton;

    uint64 constant ROOT_INITIAL_BALANCE = 10 ton;
    uint64 constant USER_DATA_INITIAL_BALANCE = 10 ton;
    uint64 constant ELECTION_INITIAL_BALANCE = 10 ton;
    uint64 constant RELAY_ROUND_INITIAL_BALANCE = 10 ton;

    // min values for calls
    uint64 constant MIN_CALL_MSG_VALUE = 50 ton;
    uint64 constant MIN_SEND_RELAYS_MSG_VALUE = 1.5 ton;
    uint64 constant DESTROY_MSG_VALUE = 1 ton;

    uint64 constant GET_WALLET_ADDRESS_VALUE = 0.5 ton;

    // DAO
    uint64 constant CAST_VOTE_VALUE = 1 ton;
    uint64 constant UNLOCK_LOCKED_VOTE_TOKENS_VALUE = 0.5 ton;
    uint64 constant UNLOCK_CASTED_VOTE_VALUE = 0.2 ton;
}
