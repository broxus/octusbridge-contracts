pragma ton-solidity >= 0.39.0;


interface IProxyTokenTransfer {
    enum BurnType { EVM, Solana }

    struct Configuration {
        address everscaleEthereumConfiguration;
        address[] ethereumEverscaleConfigurations;

        address everscaleSolanaConfiguration;
        address solanaEverscaleConfiguration;

        address tokenRoot;
        address[] outdatedTokenRoots;

        uint128 settingsDeployWalletGrams;
    }

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

    function upgrade(
        TvmCell code
    ) external;

    event WithdrawSolana(address addr, uint64 tokens, uint256 solana_addr);
    event WithdrawEthereum(int8 wid, uint256 addr, uint128 tokens, uint160 eth_addr, uint32 chainId);
}
