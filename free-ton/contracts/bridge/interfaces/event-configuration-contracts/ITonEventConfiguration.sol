pragma ton-solidity ^0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/ITonEvent.sol";


interface ITonEventConfiguration is IBasicEventConfiguration {
    struct TonEventConfiguration {
        address eventEmitter;
        uint160 proxy;
        uint32 startTimestamp;
    }

    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) external returns (address eventContract);

    function deriveEventAddress(
        ITonEvent.TonEventVoteData eventVoteData
    ) external view returns (address eventContract);

    function getDetails() external view returns(
        BasicConfiguration _basicConfiguration,
        TonEventConfiguration _networkConfiguration
    );

    function getType() external pure returns(EventType _type);

    function update(
        BasicConfiguration _basicConfiguration,
        TonEventConfiguration _networkConfiguration
    ) external;}
