pragma ton-solidity >= 0.39.0;

import "./IBasicEventConfiguration.sol";
import "./../event-contracts/ISolanaEverscaleEvent.sol";


interface ISolanaEverscaleEventConfiguration is IBasicEventConfiguration {
    struct SolanaEverscaleEventConfiguration {
        uint256 program;
        address proxy;
        uint64 startTimestamp;
        uint64 endTimestamp;
    }

    function deployEvent(
        ISolanaEverscaleEvent.SolanaEverscaleEventVoteData eventVoteData
    ) external;

    function deriveEventAddress(
        ISolanaEverscaleEvent.SolanaEverscaleEventVoteData eventVoteData
    ) external view responsible returns (address eventContract);

    function getDetails() external view responsible returns(
        BasicConfiguration _basicConfiguration,
        SolanaEverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    );

    function setEndTimestamp(uint64 endTimestamp) external;
}
