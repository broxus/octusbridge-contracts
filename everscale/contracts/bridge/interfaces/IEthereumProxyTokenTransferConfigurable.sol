pragma ton-solidity >= 0.39.0;


interface IEthereumProxyTokenTransferConfigurable {
    struct Configuration {
        address everConfiguration;
        address[] ethereumConfigurations;
        address[] outdatedTokenRoots;

        address tokenRoot;

        uint128 settingsDeployWalletGrams;
    }

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

}
