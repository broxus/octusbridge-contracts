pragma ton-solidity >= 0.39.0;


import "./../../bridge/interfaces/multivault/proxy/alien/IProxyMultiVaultAlien_V4.sol";
import "./../../bridge/interfaces/multivault/IEVMCallback.sol";

contract ProxyMultiVaultCellEncoder is IEVMCallback {
    function encodeMultiVaultAlienEVM(
        uint256 base_chainId,
        uint160 base_token,

        string name,
        string symbol,
        uint8 decimals,

        uint128 amount,
        int8 recipient_wid,
        uint256 recipient_addr,

        uint256 value,
        uint256 expected_evers,
        TvmCell payload
    ) external pure returns (TvmCell) {
        return abi.encode(
            base_chainId, base_token,
            name, symbol, decimals,
            amount, recipient_wid, recipient_addr,
            value, expected_evers, payload
        );
    }

    function encodeMultiVaultNativeEVM(
        int8 token_wid,
        uint256 token_addr,
        uint128 amount,
        int8 recipient_wid,
        uint256 recipient_addr,
        uint256 value,
        uint256 expected_evers,
        TvmCell payload
    ) external pure returns (TvmCell) {
        return abi.encode(
            token_wid, token_addr,
            amount, recipient_wid, recipient_addr,
            value, expected_evers, payload
        );
    }

    function encodeAlienBurnPayload(
        uint160 recipient,
        IProxyMultiVaultAlien_V4.EVMCallback callback
    ) external pure returns(TvmCell) {
        return abi.encode(recipient, callback);
    }

    function encodeNativeTransferPayload(
        uint160 recipient,
        uint256 chainId,
        EVMCallback callback
    ) external pure returns (TvmCell) {
        return abi.encode(recipient, chainId, callback);
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
        uint256 chainId,
        uint160 callback_recipient,
        TvmCell callback_payload,
        bool callback_strict
    ) {
        (
            token_wid, token_addr, name, symbol, decimals, amount, recipient, chainId,
            callback_recipient, callback_payload, callback_strict
        ) = abi.decode(
            data,
            (
                int8, uint256, string, string, uint8, uint128, uint160, uint256,
                uint160, TvmCell, bool
            )
        );
    }
}
