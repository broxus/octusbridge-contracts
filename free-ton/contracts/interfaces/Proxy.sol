pragma solidity >= 0.6.0;
pragma AbiHeader expire;


interface Proxy {
    function broxusBridgeCallback(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData
    ) external;
}
