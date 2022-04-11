pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEthereumEverscaleEvent.sol";


interface IEthereumEverscaleEventConfiguration is IBasicEventConfiguration {
    struct EthereumEverscaleEventConfiguration {
        uint32 chainId;
        uint160 eventEmitter;
        uint16 eventBlocksToConfirm;
        address proxy;
        uint32 startBlockNumber;
        uint32 endBlockNumber;
    }

    function deployEvent(
        IEthereumEverscaleEvent.EthereumEverscaleEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        IEthereumEverscaleEvent.EthereumEverscaleEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EthereumEverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndBlockNumber(uint32 endBlockNumber) external;
}
