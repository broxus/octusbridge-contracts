pragma ton-solidity >= 0.39.0;

import "./event-contracts/IEthereumEvent.sol";

interface IProxy is IEthereumEvent {
    function onEventConfirmed(
        IEthereumEvent.EthereumEventInitData eventData,
        address gasBackAddress
    ) external;
}
