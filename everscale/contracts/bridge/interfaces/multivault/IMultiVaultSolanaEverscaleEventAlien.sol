pragma ton-solidity >= 0.39.0;


import "./../event-configuration-contracts/ISolanaEverscaleEventConfiguration.sol";


interface IMultiVaultSolanaEverscaleEventAlien {
    function receiveConfigurationDetails(
        ISolanaEverscaleEventConfiguration.BasicConfiguration,
        ISolanaEverscaleEventConfiguration.SolanaEverscaleEventConfiguration _networkConfiguration,
        TvmCell
    ) external;

    function receiveAlienTokenRoot(
        address token_
    ) external;

    function getDecodedData() external responsible returns(
        uint256 base_token_,
        string name_,
        string symbol_,
        uint8 decimals_,
        uint64 amount_,
        address recipient_,
        address proxy_,
        address token_
    );
}