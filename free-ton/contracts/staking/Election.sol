pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

contract Election {
    address public static root;
    uint128 public round_num;

    uint8 constant NOT_FARM_POOL = 201;
    uint128 constant CONTRACT_MIN_BALANCE = 0.1 ton;

    constructor() public {
        require (stakingPool == msg.sender, NOT_FARM_POOL);
        tvm.accept();
    }



}
