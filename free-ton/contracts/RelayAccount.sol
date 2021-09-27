pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


contract RelayAccount {
    uint16 static _randomNonce;
    uint owner;

    constructor() public {
        tvm.accept();
        owner = msg.pubkey();
    }

    function sendTransaction(
        address dest,
        uint128 value,
        bool bounce,
        uint8 flags,
        TvmCell payload
    )
        public
        view
    {
        require(msg.pubkey() == owner, 101);
        tvm.accept();
        dest.transfer(value, bounce, flags, payload);
    }
}
