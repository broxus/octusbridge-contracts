pragma ton-solidity >= 0.39.0;

import "./event-contracts/IEthereumEvent.sol";

interface IProxy is IEthereumEvent {
    function broxusBridgeCallback(
        IEthereumEvent.EthereumEventInitData eventData,
        address gasBackAddress
    ) external;
}
