pragma ton-solidity ^0.39.0;


import "./ITonEvent.sol";


interface IEventProxy {
    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) external returns (address eventContract);
}
