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

    function _reserveAtLeastTargetBalance() internal view {
        tvm.rawReserve(
            math.max(address(this).balance - msg.value, _targetBalance()),
            2
        );
    }

    modifier reserveAtLeastTargetBalance() {
        _reserveAtLeastTargetBalance();

        _;
    }

    modifier reserveTargetBalance() {
        tvm.rawReserve(
            _targetBalance(),
            2
        );

        _;
    }

    modifier reserveMinBalance(uint128 min_balance) {
        tvm.rawReserve(math.max(address(this).balance - msg.value, min_balance), 2);
        _;
    }

    function _reserveTargetBalance() internal view {
        tvm.rawReserve(_targetBalance(), 0);
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

    function _targetBalance() internal pure virtual returns (uint128) {
        return 1 ton;
    }
}
