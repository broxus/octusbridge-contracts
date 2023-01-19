pragma ton-solidity >= 0.39.0;


interface IProxyMultiVaultSolanaNative {
    struct Configuration {
        address everscaleConfiguration;
        address solanaConfiguration;
        uint128 deployWalletValue;
    }

    function apiVersion() external view responsible returns(uint8);

    function getConfiguration() external view responsible returns (Configuration);
    function setConfiguration(Configuration _config, address gasBackAddress) external;

    event NativeEverSolanaTransfer(
        address token,
        string name,
        string symbol,
        uint8 decimals,
        uint128 amount,
        uint256 recipient
    );

    event NativeSolanaEverTransfer(
        address token,
        uint128 amount,
        uint64 sol_amount,
        address recipient,
        bytes payload
    );
}