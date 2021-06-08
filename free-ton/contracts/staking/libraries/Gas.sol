pragma ton-solidity ^0.39.0;

library Gas {
    // deploy
    uint128 public constant TOKEN_WALLET_DEPLOY_VALUE = 1 ton;
    uint128 public constant PLATFORM_DEPLOY_VALUE = 0.5 ton;
    uint128 public constant DEPLOY_ELECTION_MIN_VALUE = 1 ton;
    uint128 public constant DEPLOY_RELAY_ROUND_MIN_VALUE = 1 ton;
    uint128 public constant DEPLOY_USER_DATA_MIN_VALUE = 1 ton;

    uint128 public constant ROOT_INITIAL_BALANCE = 1 ton;
    uint128 public constant USER_DATA_INITIAL_BALANCE = 1 ton;
    uint128 public constant ELECTION_INITIAL_BALANCE = 1 ton;
    uint128 public constant RELAY_ROUND_INITIAL_BALANCE = 1 ton;

    // min values for calls
    uint128 public constant MIN_DEPOSIT_MSG_VALUE = 2 ton;
    uint128 public constant MIN_WITHDRAW_MSG_VALUE = 1 ton;
    uint128 public constant MIN_RELAY_REQ_MSG_VALUE = 1;
    uint128 public constant MIN_START_ELECTION_MSG_VALUE = 1.5 ton;
    uint128 public constant MIN_END_ELECTION_MSG_VALUE = 1 ton;
    uint128 public constant MIN_ORIGIN_ROUND_MSG_VALUE = 1 ton;

    uint128 public constant UPGRADE_ELECTION_MIN_VALUE = 1 ton;
    uint128 public constant UPGRADE_USER_DATA_MIN_VALUE = 1 ton;
    uint128 public constant UPGRADE_RELAY_ROUND_MIN_VALUE = 1 ton;

    uint128 public constant GET_WALLET_ADDRESS_VALUE = 0.5 ton;

}
