pragma ton-solidity >= 0.39.0;

interface IUpgradableByRequest {
    function upgrade(TvmCell code, uint16 newVersion, address sendGasTo) external;
}
