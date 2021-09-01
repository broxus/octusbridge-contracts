pragma ton-solidity >= 0.39.0;

import './event-contracts/IBasicEvent.sol';


interface IEventNotificationReceiver is IBasicEvent {
    function notifyEventStatusChanged(Status status) external;
}
