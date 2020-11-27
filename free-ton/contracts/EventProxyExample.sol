pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract EventProxy {
    uint static nonce;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();
    }

    function broxusBridgeCallback(
        bytes eventTransaction,
        uint eventIndex,
        TvmCell eventData
    ) public {

    }
}
