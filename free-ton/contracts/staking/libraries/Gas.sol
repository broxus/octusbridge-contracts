pragma ton-solidity >= 0.39.0;

library Gas {
    // deploy
    uint64 constant TOKEN_WALLET_DEPLOY_VALUE = 1 ton;
    uint64 constant DEPLOY_ELECTION_MIN_VALUE = 1 ton;
    uint64 constant DEPLOY_RELAY_ROUND_MIN_VALUE = 1.5 ton;
    uint64 constant DEPLOY_USER_DATA_MIN_VALUE = 1 ton;
    uint64 constant USER_DATA_UPGRADE_VALUE = 0.5 ton;

    uint64 constant ROOT_INITIAL_BALANCE = 1 ton;
    uint64 constant USER_DATA_INITIAL_BALANCE = 1 ton;
    uint64 constant ELECTION_INITIAL_BALANCE = 0.5 ton;
    uint64 constant RELAY_ROUND_INITIAL_BALANCE = 1 ton;

    // min values for calls
    uint64 constant MIN_DEPOSIT_MSG_VALUE = 2 ton;
    uint64 constant MIN_WITHDRAW_MSG_VALUE = 1 ton;
    uint64 constant MIN_RELAY_REQ_MSG_VALUE = 1.5 ton;
    uint64 constant MIN_START_ELECTION_MSG_VALUE = 1.5 ton;
    uint64 constant MIN_END_ELECTION_MSG_VALUE = 10 ton;
    // this must be lower than MIN_END_ELECTION_MSG_VALUE, as it is part of call chain of 'end election' action
    uint64 constant MIN_ORIGIN_ROUND_MSG_VALUE = 10 ton;
    uint64 constant MIN_CONFIRM_ETH_RELAY_ACC_MSG_VALUE = 0.5 ton;
    uint64 constant MIN_CLAIM_REWARD_MSG_VALUE = 0.5 ton;
    uint64 constant MIN_GET_REWARD_RELAY_ROUND_MSG_VALUE = 1 ton;
    uint64 constant MIN_SLASH_RELAY_MSG_VALUE = 1.5 ton;
    uint64 constant MIN_START_REWARD_ROUND_MSG_VALUE = 0.5 ton;
    uint64 constant MIN_SEND_RELAYS_MSG_VALUE = 1.5 ton;

    uint64 constant UPGRADE_ELECTION_MIN_VALUE = 1 ton;
    uint64 constant UPGRADE_USER_DATA_MIN_VALUE = 1 ton;
    uint64 constant UPGRADE_RELAY_ROUND_MIN_VALUE = 1 ton;

    uint64 constant GET_WALLET_ADDRESS_VALUE = 0.5 ton;

    // DAO
    uint64 constant CAST_VOTE_VALUE = 1 ton;
    uint64 constant UNLOCK_LOCKED_VOTE_TOKENS_VALUE = 0.5 ton;
    uint64 constant UNLOCK_CASTED_VOTE_VALUE = 0.2 ton;

}
