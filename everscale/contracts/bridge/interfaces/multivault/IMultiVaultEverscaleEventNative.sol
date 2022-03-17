pragma ton-solidity >= 0.39.0;


interface IMultiVaultEverscaleEventNative {
    function receiveTokenName(string name_) external;
    function receiveTokenSymbol(string symbol_) external;
    function receiveTokenDecimals(uint8 decimals_) external;
    function receiveProxyTokenWallet(address tokenWallet_) external;

    function getDecodedData() external responsible returns(
        address proxy_,
        address tokenWallet_,
        address token_,
        address remainingGasTo_,
        uint128 amount_,
        uint160 recipient_,
        uint256 chainId_,
        string name_,
        string symbol_,
        uint8 decimals_
    );
}