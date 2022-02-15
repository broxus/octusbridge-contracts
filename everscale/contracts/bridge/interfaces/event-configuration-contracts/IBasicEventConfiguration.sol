pragma ton-solidity >= 0.39.0;


interface IBasicEventConfiguration {
    enum EventType { Ethereum, Everscale }

    struct BasicConfiguration {
        bytes eventABI;
        address staking;
        uint64 eventInitialBalance;
        TvmCell eventCode;
    }

    event NewEventContract(address eventContract);

    function getType() external pure responsible returns(EventType _type);
    function setMeta(TvmCell _meta) external;
}
