pragma ton-solidity >= 0.39.0;

import "./Staking.sol";

contract StakingRootDeployer {
    uint256 static nonce;
    TvmCell static stakingCode;

    uint8 constant WRONG_PUBKEY = 101;

    constructor() public {
        require (tvm.pubkey() == msg.pubkey(), WRONG_PUBKEY);
        tvm.accept();
    }

    function deploy(
        address _admin,
        address _dao_root,
        address _rewarder,
        address _rescuer,
        address _bridge_event_config_eth_ton,
        address _bridge_event_config_ton_eth,
        address _tokenRoot,
        uint32 _deploy_nonce
    ) public returns(address) {
        tvm.accept();
        return new Staking {
            stateInit: tvm.buildStateInit({
                pubkey: tvm.pubkey(),
                code: stakingCode,
                contr: Staking,
                varInit: {
                    deploy_nonce: _deploy_nonce,
                    deployer: address(this)
                }
            }),
            value: 0,
            flag: 128
        }(_admin, _dao_root, _rewarder, _rescuer, _bridge_event_config_eth_ton, _bridge_event_config_ton_eth, _tokenRoot);
    }
}
