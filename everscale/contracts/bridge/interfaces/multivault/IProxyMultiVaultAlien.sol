pragma ton-solidity >= 0.39.0;


interface IProxyMultiVaultAlien {
    struct Configuration {
        address everscaleConfiguration;
        address[] evmConfigurations;
        uint128 deployWalletValue;

        TvmCell alienTokenRootCode;
        TvmCell alienTokenWalletCode;
        TvmCell alienTokenWalletPlatformCode;

        TvmCell mergeRouter;
        TvmCell mergePool;
    }

    function apiVersion() external view responsible returns(uint8);

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

    function mintTokensByMergePool(
        uint nonce,
        address token,
        uint128 amount,
        address recipient,
        address remainingGasTo
    ) external;

    function deriveAlienTokenRoot(
        uint256 base_chainId,
        uint160 base_token,
        string name,
        string symbol,
        uint8 decimals
    ) external responsible returns (address);

    function deployAlienToken(
        uint256 chainId,
        uint160 token,
        string name,
        string symbol,
        uint8 decimals,
        address remainingGasTo
    ) external;

    function deriveMergeRouter(
        address token
    ) external responsible returns (address);

    function deployMergeRouter(
        address token
    ) external;

    function deriveMergePool(
        uint256 nonce
    ) external responsible returns (address);

    function deployMergePool(
        uint256 nonce,
        address[] tokens,
        uint256 canonId
    ) external;

    function setManager(
        address _manager
    ) external;

    function sendMessage(
        address recipient,
        TvmCell message
    ) external;

    function mint(
        address token,
        uint128 amount,
        address recipient
    ) external;

    function burn(
        address token,
        uint128 amount,
        address walletOwner
    ) external;

    function setMergeRouterCode(
        TvmCell code
    ) external;

    function setMergePoolCode(
        TvmCell code
    ) external;

    event AlienTransfer(
        uint160 token,
        uint128 amount,
        uint160 recipient,
        uint256 chainId
    );
}
