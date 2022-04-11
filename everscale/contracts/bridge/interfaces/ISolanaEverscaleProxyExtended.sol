pragma ton-solidity >= 0.39.0;

import "./event-contracts/ISolanaEverscaleEvent.sol";

interface ISolanaEverscaleProxyExtended is ISolanaEverscaleEvent {
    function onEventConfirmedExtended(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventData,
        TvmCell meta,
        address gasBackAddress
    ) external;
}
