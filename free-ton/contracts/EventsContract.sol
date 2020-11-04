pragma solidity >= 0.5.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


contract EventsConfiguration {
    bytes[] ethereumEventABI;
    bytes[] ethereumAddress;

    constructor(
        bytes[] _ethereumEventABI,
        bytes[] _ethereumAddress
    ) public {
        tvm.accept();

        ethereumEventABI = _ethereumEventABI;
        ethereumAddress = _ethereumAddress;
    }

    function getEventDetails() external view returns(bytes[], bytes[]) {
        return (ethereumEventABI, ethereumAddress);
    }
}
