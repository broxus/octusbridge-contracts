pragma ton-solidity >= 0.39.0;


interface IBasicEventConfiguration {
    enum EventType { Ethereum, TON }

    struct BasicConfiguration {
        bytes eventABI;
        address staking;
        uint64 eventInitialBalance;
        TvmCell eventCode;
        TvmCell meta;
    }

    function getType() external pure responsible returns(EventType _type);
}
