pragma ton-solidity >= 0.39.0;


interface ITokenRootAlienEVM {
    function meta() external responsible returns (
        uint256 base_chainId,
        uint160 base_token,
        string name,
        string symbol,
        uint8 decimals
    );
}