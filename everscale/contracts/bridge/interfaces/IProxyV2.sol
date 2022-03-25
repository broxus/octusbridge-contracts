pragma ton-solidity >= 0.39.0;

import "./event-contracts/IEthereumEvent.sol";

interface IProxyV2 is IEthereumEvent {
    function onEventConfirmedExtended(
        IEthereumEvent.EthereumEventInitData eventData,
        TvmCell meta,
        address gasBackAddress
    ) external;
}
