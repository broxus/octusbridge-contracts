pragma ton-solidity >= 0.39.0;


interface IConnector {
    function enable() external;

    event Enabled();
}
