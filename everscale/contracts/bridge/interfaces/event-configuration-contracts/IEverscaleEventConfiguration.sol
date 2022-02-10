pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEverscaleEvent.sol";


interface IEverscaleEventConfiguration is IBasicEventConfiguration {
    struct EverscaleEventConfiguration {
        address eventEmitter;
        uint160 proxy;
        uint32 startTimestamp;
        uint32 endTimestamp;
    }

    function deployEvent(
        IEverscaleEvent.EverscaleEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        IEverscaleEvent.EverscaleEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndTimestamp(uint32 endTimestamp) external;
}
