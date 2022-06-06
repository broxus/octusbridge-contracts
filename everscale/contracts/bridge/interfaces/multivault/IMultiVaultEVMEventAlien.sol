pragma ton-solidity >= 0.39.0;


import "./../event-configuration-contracts/IEthereumEventConfiguration.sol";
import "./../../interfaces/alien-token-merge/IMergePool.sol";


interface IMultiVaultEVMEventAlien {
    function receiveConfigurationDetails(
        IEthereumEventConfiguration.BasicConfiguration,
        IEthereumEventConfiguration.EthereumEventConfiguration _networkConfiguration,
        TvmCell
    ) external;

    function receiveAlienTokenRoot(
        address token_
    ) external;


    function receiveTokenMeta(
        uint256 base_chainId_,
        uint160 base_token_,
        string name,
        string symbol,
        uint8 decimals
    ) external;

    function receiveMergeRouter(
        address router_
    ) external;

    function receiveMergeRouterPool(
        address pool_
    ) external;

    function receiveMergePoolCanon(
        address canon_,
        IMergePool.Token canonToken_
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

    function getDecodedDataExtended() external responsible returns(
        uint256 base_chainId_,
        uint160 base_token_,
        string name_,
        string symbol_,
        uint8 decimals_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address token_,
        address router_,
        address pool_,
        address canon_,
        address target_token_,
        uint128 target_amount_
    );
}
