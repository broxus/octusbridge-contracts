pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;
pragma AbiHeader expire;

import "./base/StakingRelay.sol";

contract Staking is StakingPoolRelay {
    constructor(
        address _admin,
        address _dao_root,
        address _rewarder,
        address _bridge_event_config_eth_ton,
        address _bridge_event_config_ton_eth,
        address _tokenRoot
    ) public {
        tvm.accept();

        base_details.tokenRoot = _tokenRoot;
        base_details.bridge_event_config_eth_ton = _bridge_event_config_eth_ton;
        base_details.bridge_event_config_ton_eth = _bridge_event_config_ton_eth;
        base_details.admin = _admin;
        base_details.dao_root = _dao_root;
        base_details.rewarder = _rewarder;
        base_details.rewardRounds.push(RewardRound(0, 0, 0, now));
        setUpTokenWallets();
    }
}
