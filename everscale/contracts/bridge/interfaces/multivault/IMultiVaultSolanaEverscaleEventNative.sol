pragma ton-solidity >= 0.39.0;


import "./../event-configuration-contracts/ISolanaEverscaleEventConfiguration.sol";


interface IMultiVaultSolanaEverscaleEventNative {
    function receiveConfigurationDetails(
        ISolanaEverscaleEventConfiguration.BasicConfiguration,
        ISolanaEverscaleEventConfiguration.SolanaEverscaleEventConfiguration _networkConfiguration,
        TvmCell
    ) external;

    function receiveProxyTokenWallet(
        address tokenWallet_
    ) external;

    function getDecodedData() external responsible returns(
        address token_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address tokenWallet_
    );
}