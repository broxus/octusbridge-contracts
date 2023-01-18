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

    function deployEvents(
        IEthereumEvent.EthereumEventVoteData[] eventsVoteData,
        uint128[] values
    ) external;

    function deriveEventAddress(
        IEthereumEverscaleEvent.EthereumEverscaleEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EthereumEverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function getFlags() external view responsible returns(uint64 _flags);

    function setEndBlockNumber(uint32 endBlockNumber) external;
    function setFlags(uint64 _flags) external;
    function setEventInitialBalance(uint64 eventInitialBalance) external;
}
