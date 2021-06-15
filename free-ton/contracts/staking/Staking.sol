pragma ton-solidity ^0.39.0;

import "./base/StakingRelay.sol";

contract Staking is StakingPoolRelay {
    constructor(address _owner, address _tokenRoot) public {
        tvm.accept();

        tokenRoot = _tokenRoot;
        owner = _owner;
        setUpTokenWallets();
    }
}
