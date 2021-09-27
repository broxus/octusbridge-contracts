pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


contract TransferUtils {
    modifier transferAfter(address receiver, uint128 value) {
        _;
        receiver.transfer({ value: value });
    }

    modifier transferAfterRest(address receiver) {
        _;
        receiver.transfer({ flag:64, value: 0 });
    }

    function transferAll(address receiver) internal pure {
        receiver.transfer({ flag: 129, value: 0 });
    }

    modifier reserveBalance() {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        _;
    }

    modifier cashBack() {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        _;
        msg.sender.transfer({ value: 0, flag: 129 });
    }

    modifier cashBackTo(address receiver) {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        _;
        receiver.transfer({ value: 0, flag: 129 });
    }
}
