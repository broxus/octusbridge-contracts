pragma ton-solidity >= 0.39.0;


interface ISolanaProxyTokenTransferConfigurable {
    struct Configuration {
        address everConfiguration;
        address solanaConfiguration;

        address tokenRoot;
        string solanaTokenSymbol;
        uint8 solanaDecimals;
        uint8 everscaleDecimals;

        uint128 settingsDeployWalletGrams;
    }

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

}
