pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEthereumEvent.sol";


interface IEthereumEventConfiguration is IBasicEventConfiguration {
    struct EthereumEventConfiguration {
        uint32 chainId;
        uint160 eventEmitter;
        uint16 eventBlocksToConfirm;
        address proxy;
        uint32 startBlockNumber;
        uint32 endBlockNumber;
    }

    function deployEvent(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndBlockNumber(uint32 endBlockNumber) external;
}
