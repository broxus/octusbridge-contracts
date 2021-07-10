pragma ton-solidity ^0.39.0;

import "./base/StakingRelay.sol";

contract Staking is StakingPoolRelay {
    constructor(address _admin, address _dao_root, address _rewarder, address _bridge, address _tokenRoot) public {
        tvm.accept();

        tokenRoot = _tokenRoot;
        bridge = _bridge;
        admin = _admin;
        dao_root = _dao_root;
        rewarder = _rewarder;
        rewardRounds.push(RewardRound(0, 0, 0, now));
        setUpTokenWallets();
    }
}
