pragma ton-solidity ^0.39.0;
pragma AbiHeader pubkey;


import "./interfaces/ITonEvent.sol";


contract EventProxyMockup {
    uint64 static nonce;

    constructor() public { tvm.accept(); }

    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) external returns (address eventContract) {
        return address.makeAddrNone();
    }

}
