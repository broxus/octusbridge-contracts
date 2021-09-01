pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;

import "./base/StakingRelay.sol";

contract Staking is StakingPoolRelay {
    constructor(
        address _admin,
        address _dao_root,
        address _rewarder,
        address _bridge_event_config,
        address _bridge_event_proxy,
        address _tokenRoot
    ) public {
        tvm.accept();

        tokenRoot = _tokenRoot;
        bridge_event_config = _bridge_event_config;
        bridge_event_proxy = _bridge_event_proxy;
        admin = _admin;
        dao_root = _dao_root;
        rewarder = _rewarder;
        rewardRounds.push(RewardRound(0, 0, 0, now));
        setUpTokenWallets();
    }
}
