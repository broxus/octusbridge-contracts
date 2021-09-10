pragma ton-solidity >= 0.39.0;


import "../../bridge/interfaces/event-contracts/ITonEvent.sol";


interface IEventProxy {
    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) external returns (address eventContract);
}
