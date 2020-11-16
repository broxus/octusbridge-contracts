pragma solidity >= 0.5.0;

interface IEventProxy {
    function bridgeCallback(bytes payload) external;
}
