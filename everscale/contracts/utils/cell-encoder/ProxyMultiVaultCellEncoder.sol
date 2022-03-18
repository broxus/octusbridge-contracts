pragma ton-solidity >= 0.39.0;


contract ProxyMultiVaultCellEncoder {
    function encodeMultiVaultAlienEVM(
        uint256 base_chainId,
        uint160 base_token,
        string name,
        string symbol,
        uint8 decimals,
        uint128 amount,
        int8 recipient_wid,
        uint256 recipient_addr
    ) external pure returns (TvmCell) {
        return abi.encode(base_chainId, base_token, name, symbol, decimals, amount, recipient_wid, recipient_addr);
    }

    function encodeMultiVaultNativeEVM(
        int8 token_wid,
        uint256 token_addr,
        uint128 amount,
        int8 recipient_wid,
        uint256 recipient_addr
    ) external pure returns (TvmCell) {
        return abi.encode(token_wid, token_addr, amount, recipient_wid, recipient_addr);
    }

    function encodeAlienBurnPayload(
        uint160 recipient
    ) external pure returns(TvmCell) {
        return abi.encode(recipient);
    }

    function encodeNativeTransferPayload(
        uint160 recipient,
        uint256 chainId
    ) external pure returns (TvmCell) {
        return abi.encode(recipient, chainId);
    }

    function decodeMultiVaultAlienEverscale(
        TvmCell data
    ) external pure returns (
        uint160 base_token,
        uint128 amount,
        uint160 recipient,
        uint256 base_chainId
    ) {
        (base_token, amount, recipient,base_chainId) = abi.decode(
            data,
            (uint160, uint128, uint160, uint256)
        );
    }

    function decodeMultiVaultNativeEverscale(
        TvmCell data
    ) external pure returns(
        int8 token_wid,
        uint256 token_addr,
        string name,
        string symbol,
        uint8 decimals,
        uint128 amount,
        uint160 recipient,
        uint256 chainId
    ) {
        (token_wid, token_addr, name, symbol, decimals, amount, recipient, chainId) = abi.decode(
            data,
            (int8, uint256, string, string, uint8, uint128, uint160, uint256)
        );
    }
}