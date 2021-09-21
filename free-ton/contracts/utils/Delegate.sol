pragma ton-solidity >= 0.39.0;

abstract contract Delegate {
    uint16 constant DELEGATE_NOT_FOUND = 1201;
    uint16 constant DELEGATE_HAS_EMPTY_CALLS = 1202;
    uint16 constant WRONG_DELEGATE_CALL_HASH = 1203;

    mapping(address => uint[]) public delegators;

    modifier onlyDelegate {
        checkDelegate();
        _;
    }

    function checkDelegate() internal {
        optional(uint[]) optDelegate = delegators.fetch(msg.sender);
        require(optDelegate.hasValue(), DELEGATE_NOT_FOUND);
        uint[] delegate = optDelegate.get();
        uint delegatedCalls = delegate.length;
        require(delegatedCalls != 0, DELEGATE_HAS_EMPTY_CALLS);
        uint callHash = tvm.hash(msg.data);
        if (delegatedCalls == 1) {
            require(delegate[0] == callHash, WRONG_DELEGATE_CALL_HASH);
            delete delegators[msg.sender];
        } else {
            bool found = false;
            uint[] newDelegate;
            for (uint i = 0; i < delegatedCalls; i++) {
                if (delegate[i] == callHash && !found) {
                    found = true;
                } else {
                    newDelegate.push(delegate[i]);
                }
            }
            require(found, WRONG_DELEGATE_CALL_HASH);
            delegators[msg.sender] = newDelegate;
        }
    }

}
