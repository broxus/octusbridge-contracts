pragma ton-solidity >= 0.39.0;


interface IProxyMultiVaultSolanaAlien {
    struct Configuration {
        address everscaleConfiguration;
        address solanaConfiguration;
        uint128 deployWalletValue;

        TvmCell alienTokenRootCode;
        TvmCell alienTokenWalletCode;
        TvmCell alienTokenWalletPlatformCode;
    }

    function apiVersion() external view responsible returns(uint8);

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

    function deriveAlienTokenRoot(
        uint256 base_token,
        string name,
        string symbol,
        uint8 decimals
    ) external responsible returns (address);

    function deployAlienToken(
        uint256 token,
        string name,
        string symbol,
        uint8 decimals,
        address remainingGasTo
    ) external;

    function sendMessage(
        address recipient,
        TvmCell message
    ) external;

    event AlienTransfer(
        uint256 token,
        uint128 amount,
        uint256 recipient
    );
}