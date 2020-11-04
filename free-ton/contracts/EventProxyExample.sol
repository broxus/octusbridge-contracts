pragma solidity >= 0.5.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


contract EventProxy {
    uint public nonce;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();
    }

    function broxusBridgeCallback() public {

    }
}
