pragma ton-solidity >= 0.39.0;


import "./../event-configuration-contracts/IEthereumEverscaleEventConfiguration.sol";


interface IMultiVaultSolanaEverscaleEventAlien {
    function receiveConfigurationDetails(
        IEthereumEverscaleEventConfiguration.BasicConfiguration,
        IEthereumEverscaleEventConfiguration.EthereumEverscaleEventConfiguration _networkConfiguration,
        TvmCell
    ) external;

    function receiveAlienTokenRoot(
        address token_
    ) external;

    function getDecodedData() external responsible returns(
        uint256 base_chainId_,
        uint160 base_token_,
        string name_,
        string symbol_,
        uint8 decimals_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address token_
    );
}