pragma ton-solidity >= 0.39.0;

import "./event-contracts/IEthereumEverscaleEvent.sol";

interface IEthereumEverscaleProxy is IEthereumEverscaleEvent {
    function onEventConfirmed(
        IEthereumEverscaleEvent.EthereumEverscaleEventInitData eventData,
        address gasBackAddress
    ) external;
}
