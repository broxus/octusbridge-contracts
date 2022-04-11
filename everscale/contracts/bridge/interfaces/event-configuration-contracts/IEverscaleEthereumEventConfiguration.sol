pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEverscaleEthereumEvent.sol";


interface IEverscaleEthereumEventConfiguration is IBasicEventConfiguration {
    struct EverscaleEthereumEventConfiguration {
        address eventEmitter;
        uint160 proxy;
        uint32 startTimestamp;
        uint32 endTimestamp;
    }

    function deployEvent(
        IEverscaleEthereumEvent.EverscaleEthereumEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        IEverscaleEthereumEvent.EverscaleEthereumEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EverscaleEthereumEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndTimestamp(uint32 endTimestamp) external;
}
