pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/IEverscaleSolanaEvent.sol";


interface IEverscaleSolanaEventConfiguration is IBasicEventConfiguration {
    struct EverscaleSolanaEventConfiguration {
        address eventEmitter;
        uint256 proxy;
        uint32 startTimestamp;
        uint32 endTimestamp;
    }

    function deployEvent(
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        EverscaleSolanaEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndTimestamp(uint32 endTimestamp) external;
}
