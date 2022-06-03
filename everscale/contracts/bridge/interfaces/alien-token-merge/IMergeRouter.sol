pragma ton-solidity >= 0.39.0;


interface IMergeRouter {
    function setPool(
        address pool_
    ) external;
    function setManager(
        address _manager
    ) external;

    function disablePool() external;

    function getPool() external responsible returns (address);
    function getDetails() external responsible returns (address, address, address);
}
