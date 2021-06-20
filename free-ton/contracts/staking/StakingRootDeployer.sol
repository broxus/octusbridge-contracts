pragma ton-solidity ^0.39.0;

import "./Staking.sol";

contract StakingRootDeployer {
    constructor() public {
        tvm.accept();
    }

    function deploy(TvmCell stakingCode, address _owner, address _tokenRoot) public returns(address) {
        tvm.accept();
        return new Staking {
            stateInit: tvm.buildStateInit({
                pubkey: tvm.pubkey(),
                code: stakingCode
            }),
            value: address(this).balance - 0.2 ton,
            flag: 0
        }(_owner, _tokenRoot);
    }
}
