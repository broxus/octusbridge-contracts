pragma ton-solidity ^0.39.0;


import './IEvent.sol';


interface IStaking {
    function confirmEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external;

    function rejectEthereumEvent(
        IEvent.EthereumEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external;

    function confirmTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        bytes eventDataSignature,
        uint32 configurationID,
        address relay
    ) external;

    function rejectTonEvent(
        IEvent.TonEventVoteData eventVoteData,
        uint32 configurationID,
        address relay
    ) external;
}
