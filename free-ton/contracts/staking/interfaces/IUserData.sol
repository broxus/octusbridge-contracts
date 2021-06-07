pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


interface IUserData {
    struct UserDataDetails {
        uint256 token_balance;
        uint256 reward_debt;
        uint256 reward_balance;
        address root;
        address user;
        uint32 current_version;
    }

    function getDetails() external responsible view returns (UserDataDetails);
    function processDeposit(uint64 nonce, uint128 _amount, uint256 _accTonPerShare, uint32 code_version) external;
    function processWithdraw(uint128 _amount, uint256 _accTonPerShare, address send_gas_to) external;
    function processBecomeRelay(uint128 round_num, uint128 election_start_time) external;
}
