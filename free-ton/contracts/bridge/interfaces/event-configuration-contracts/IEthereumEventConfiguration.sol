pragma ton-solidity ^0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEthereumEvent.sol";


interface IEthereumEventConfiguration is IBasicEventConfiguration {
    struct EthereumEventConfiguration {
        uint160 eventEmitter;
        uint16 eventBlocksToConfirm;
        address proxy;
        uint32 startBlockNumber;
    }

    function deployEvent(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) external returns (address eventContract);

    function deriveEventAddress(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
    );

    function getType() external pure responsible returns(EventType _type);

    function update(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
    ) external;
}
