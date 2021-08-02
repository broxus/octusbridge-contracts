pragma ton-solidity ^0.39.0;

library Gas {
    // deploy
    uint128 constant TOKEN_WALLET_DEPLOY_VALUE = 1 ton;
    uint128 constant DEPLOY_ELECTION_MIN_VALUE = 1 ton;
    uint128 constant DEPLOY_RELAY_ROUND_MIN_VALUE = 1.5 ton;
    uint128 constant DEPLOY_USER_DATA_MIN_VALUE = 1 ton;
    uint128 constant USER_DATA_UPGRADE_VALUE = 0.5 ton;

    uint128 constant ROOT_INITIAL_BALANCE = 1 ton;
    uint128 constant USER_DATA_INITIAL_BALANCE = 1 ton;
    uint128 constant ELECTION_INITIAL_BALANCE = 0.5 ton;
    uint128 constant RELAY_ROUND_INITIAL_BALANCE = 1 ton;

    // min values for calls
    uint128 constant MIN_DEPOSIT_MSG_VALUE = 2 ton;
    uint128 constant MIN_WITHDRAW_MSG_VALUE = 1 ton;
    uint128 constant MIN_RELAY_REQ_MSG_VALUE = 1;
    uint128 constant MIN_START_ELECTION_MSG_VALUE = 1.5 ton;
    uint128 constant MIN_END_ELECTION_MSG_VALUE = 2 ton;
    uint128 constant MIN_ORIGIN_ROUND_MSG_VALUE = 3 ton;
    uint128 constant MIN_LINK_RELAY_ACCS_MSG_VALUE = 5 ton;
    uint128 constant MIN_CONFIRM_ETH_RELAY_ACC_MSG_VALUE = 0.5 ton;
    uint128 constant MIN_CLAIM_REWARD_MSG_VALUE = 0.5 ton;
    uint128 constant MIN_GET_REWARD_RELAY_ROUND_MSG_VALUE = 1 ton;
    uint128 constant MIN_SLASH_RELAY_MSG_VALUE = 1.5 ton;
    uint128 constant MIN_START_REWARD_ROUND_MSG_VALUE = 0.5 ton;
    uint128 constant MIN_SEND_RELAYS_MSG_VALUE = 1.5 ton;

    uint128 constant UPGRADE_ELECTION_MIN_VALUE = 1 ton;
    uint128 constant UPGRADE_USER_DATA_MIN_VALUE = 1 ton;
    uint128 constant UPGRADE_RELAY_ROUND_MIN_VALUE = 1 ton;

    uint128 constant GET_WALLET_ADDRESS_VALUE = 0.5 ton;

    // DAO
    uint128 constant CAST_VOTE_VALUE = 1 ton;
    uint128 constant UNLOCK_LOCKED_VOTE_TOKENS_VALUE = 0.5 ton;
    uint128 constant UNLOCK_CASTED_VOTE_VALUE = 0.2 ton;

}
