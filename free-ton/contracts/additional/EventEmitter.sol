pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


contract EventEmitter {
    uint16 static _randomNonce;

    uint state;

    event TONStateChange(uint state);

    function setState(uint _state) public {
        tvm.accept();

        state = _state;

        emit TONStateChange(_state);
    }
}
