pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;


import "../bridge/interfaces/event-contracts/IEverscaleEthereumEvent.sol";


contract TonConfigMockup {
    uint64 static nonce;

    constructor() public { tvm.accept(); }

    function deployEvent(
        IEverscaleEthereumEvent.EverscaleEthereumEventVoteData eventVoteData
    ) external  {
        return;
    }

}
