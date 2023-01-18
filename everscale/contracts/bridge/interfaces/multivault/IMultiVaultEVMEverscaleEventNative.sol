pragma ton-solidity >= 0.39.0;


import "./../event-configuration-contracts/IEthereumEverscaleEventConfiguration.sol";


interface IMultiVaultEVMEverscaleEventNative {
    function receiveConfigurationDetails(
        IEthereumEverscaleEventConfiguration.BasicConfiguration,
        IEthereumEverscaleEventConfiguration.EthereumEverscaleEventConfiguration _networkConfiguration,
        TvmCell
    ) external;

    function receiveProxyTokenWallet(
        address tokenWallet_
    ) external;

    function getDecodedData() external responsible returns(
        address token_,
        uint128 amount_,
        address recipient_,
        uint value_,
        uint expected_evers_,
        TvmCell payload_,
        address proxy_,
        address tokenWallet_
    );
}
