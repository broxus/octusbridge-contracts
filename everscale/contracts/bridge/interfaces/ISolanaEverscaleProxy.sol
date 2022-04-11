pragma ton-solidity >= 0.39.0;

import "./event-contracts/ISolanaEverscaleEvent.sol";

interface ISolanaEverscaleProxy is ISolanaEverscaleEvent {
    function onEventConfirmed(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventData,
        address gasBackAddress
    ) external;
}
