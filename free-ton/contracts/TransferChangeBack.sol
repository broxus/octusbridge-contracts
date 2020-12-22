pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract TransferChangeBack {
    modifier transferChangeBack() {
        _;
        msg.sender.transfer({ flag:64 });
    }
}
