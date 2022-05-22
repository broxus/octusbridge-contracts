pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;


import "../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";


contract TonConfigMockup {
    uint64 static nonce;

    constructor() public { tvm.accept(); }

    function deployEvent(
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    ) external  {
        return;
    }
}
