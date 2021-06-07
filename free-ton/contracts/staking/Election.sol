pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./libraries/MsgFlag.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./libraries/PlatformTypes.sol";


contract Election {
    address public static root;
    uint128 public round_num;

    uint8 constant NOT_FARM_POOL = 201;
    uint128 constant CONTRACT_MIN_BALANCE = 0.1 ton;

    constructor() public {
        require (root == msg.sender, StakingErrors.NOT_ROOT);
        tvm.accept();
    }



}
