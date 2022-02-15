pragma ton-solidity >= 0.39.0;


interface IProxyTokenTransferConfigurable {
    struct Configuration {
        address tonConfiguration;
        address[] ethereumConfigurations;
        address[] outdatedTokenRoots;

        address tokenRoot;

        uint128 settingsDeployWalletGrams;
    }

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

}
