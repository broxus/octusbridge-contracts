pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/ITonEvent.sol";


interface ITonEventConfiguration is IBasicEventConfiguration {
    struct TonEventConfiguration {
        address eventEmitter;
        uint160 proxy;
        uint32 startTimestamp;
        uint32 endTimestamp;
    }

    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        ITonEvent.TonEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        TonEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndTimestamp(uint32 endTimestamp) external;
}
