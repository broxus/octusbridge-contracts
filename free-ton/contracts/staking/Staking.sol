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

        tokenRoot = _tokenRoot;
        bridge_event_config_eth_ton = _bridge_event_config_eth_ton;
        bridge_event_config_ton_eth = _bridge_event_config_ton_eth;
        admin = _admin;
        dao_root = _dao_root;
        rewarder = _rewarder;
        rewardRounds.push(RewardRound(0, 0, 0, now));
        setUpTokenWallets();
    }
}
