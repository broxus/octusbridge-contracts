pragma solidity >= 0.5.0;
pragma AbiHeader expire;

contract Giver {
    constructor() public {
        tvm.accept();
    }

//    receive() external {
//        tvm.accept();
//    }

    function sendGrams(address dest, uint64 amount) public {
        tvm.accept();
        require(address(this).balance > amount, 60);
        dest.transfer(amount, false, 1);
    }
}
