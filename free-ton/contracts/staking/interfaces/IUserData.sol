pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;

import "./IStakingPool.sol";

interface IUserData {
    struct RewardRoundData {
        uint128 reward_balance;
        uint128 reward_debt;
    }

    struct UserDataDetails {
        uint128 token_balance;
        uint32 relay_lock_until;
        uint32 current_version;
        RewardRoundData[] rewardRounds;
        uint160 relay_eth_address;
        bool eth_address_confirmed;
        uint256 relay_ton_pubkey;
        bool ton_pubkey_confirmed;
        bool slashed;
        address root;
        address user;
        address dao_root;
    }

    event RelayKeysUpdated(uint256 ton_pubkey, uint160 eth_address);
    event TonPubkeyConfirmed(uint256 ton_pubkey);
    event EthAddressConfirmed(uint160 eth_addr);
    event UserDataCodeUpgraded(uint32 code_version);
    event RelayMembershipRequested(uint32 round_num, uint128 tokens, uint256 ton_pubkey, uint160 eth_address, uint32 lock_until);
    event RelayRoundRewardClaimed(uint32 relay_round_num, uint32 reward_round_num, uint128 reward);
    event DepositProcessed(uint128 tokens_deposited, uint128 new_balance);

    // dao
    event VoteCast(uint32 proposal_id, bool support, uint128 votes, string reason);
    event UnlockVotes(uint32 proposal_id, uint128 value);
    event UnlockCastedVotes(uint32 proposal_id);
    event ProposalCreationRejected(uint128 votes_available, uint128 threshold);
    event ProposalCodeUpgraded(uint128 votes_available, uint128 threshold);

    function lockedTokens() external view responsible returns(uint128);
    function canWithdrawVotes() external view responsible returns (bool);

    function castVote(uint32 code_version, uint32 proposal_id, bool support, string reason) external;
    function rejectVote(uint32 proposal_id) external;
    function voteCasted(uint32 proposal_id) external;

    function propose(TvmCell proposal_data, uint128 threshold) external;
    function onProposalDeployed(uint32 nonce, uint32 proposal_id, uint32 answer_id) external;
    function tryUnlockVoteTokens(uint32 code_version, uint32 proposal_id) external view;
    function unlockVoteTokens(uint32 proposal_id, bool success) external;
    function tryUnlockCastedVotes(uint32 code_version, uint32[] proposalIds) external view;
    function unlockCastedVote(uint32 proposalId, bool success) external;


    function getDetails() external responsible view returns (UserDataDetails);
    function processLinkRelayAccounts(uint256 ton_pubkey, uint160 eth_address, bool confirm, uint32 user_data_code_version) external;
    function processConfirmEthAccount(uint160 eth_address, address send_gas_to) external;
    function processDeposit(
        uint64 nonce,
        uint128 _tokens_to_deposit,
        IStakingPool.RewardRound[] reward_rounds,
        uint32 code_version
    ) external;
    function withdrawTons() external;
    function processWithdraw(
        uint128 _tokens_to_withdraw,
        IStakingPool.RewardRound[] reward_rounds,
        bool emergency,
        address send_gas_to,
        uint32 code_version
    ) external;
    function processClaimReward(IStakingPool.RewardRound[] reward_rounds, address send_gas_to, uint32 code_version) external;
    function slash(IStakingPool.RewardRound[] reward_rounds, address send_gas_to) external;
    function processBecomeRelayNextRound2(
        uint32 round_num,
        uint32 lock_time,
        uint128 min_relay_deposit,
        uint32 user_data_code_version,
        uint32 election_code_version
    ) external;
    function relayMembershipRequestAccepted(uint32 round_num, uint128 tokens, uint256 ton_pubkey, uint160 eth_addr, uint32 lock_time) external;
    function receiveRewardForRelayRound(uint32 relay_round_num, uint32 reward_round_num, uint128 reward) external;
    function processGetRewardForRelayRound2(
        IStakingPool.RewardRound[] reward_rounds,
        uint32 round_num,
        uint32 code_version,
        uint32 relay_round_code_version
    ) external;
}
