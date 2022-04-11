pragma ton-solidity >= 0.39.0;

import "./event-contracts/IEthereumEverscaleEvent.sol";

interface IProxyExtended is IEthereumEverscaleEvent {
    function onEventConfirmedExtended(
        IEthereumEverscaleEvent.EthereumEverscaleEventInitData eventData,
        TvmCell meta,
        address gasBackAddress
    ) external;
}
