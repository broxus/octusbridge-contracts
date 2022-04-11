pragma ton-solidity >= 0.39.0;


interface ISolanaProxyTokenTransferConfigurable {
    struct Configuration {
        address tonConfiguration;
        address solanaConfiguration;
        address[] outdatedTokenRoots;

        address tokenRoot;

        uint128 settingsDeployWalletGrams;
    }

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

}
