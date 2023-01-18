pragma ton-solidity >= 0.39.0;

import "./../../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";

import "./../../bridge/interfaces/multivault/proxy/alien/IProxyMultiVaultAlien_V4.sol";
import "./../../bridge/interfaces/multivault/IEVMCallback.sol";
contract ProxyMultiVaultCellEncoder is IEVMCallback {
    function encodeMultiVaultAlienEVMEverscale(
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

    function encodeMultiVaultNativeEVMEverscale(
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

    function encodeAlienBurnPayloadEthereum(
        uint160 recipient
    ) external pure returns(TvmCell) {
        return abi.encode(recipient, callback);
    }

    function encodeNativeTransferPayloadEthereum(
        uint160 recipient,
        uint256 chainId,
        EVMCallback callback
    ) external pure returns (TvmCell) {
        return abi.encode(recipient, chainId, callback);
    }

    function decodeMultiVaultAlienEverscaleEthereum(
        TvmCell data
    ) external pure returns (
        uint160 base_token,
        uint128 amount,
        uint160 recipient,
        uint256 base_chainId,

        uint160 callback_recipient,
        TvmCell callback_payload,
        bool callback_strict
    ) {
        (base_token, amount, recipient,base_chainId, callback_recipient, callback_payload, callback_strict) = abi.decode(
            data,
            (uint160, uint128, uint160, uint256, uint160, TvmCell, bool)
        );
    }

    function decodeMultiVaultNativeEverscaleEthereum(
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

    function encodeMultiVaultAlienSolanaEverscale(
        uint256 base_token,
        string name,
        string symbol,
        uint8 decimals,
        uint128 amount,
        uint64 sol_amount,
        address recipient,
        bytes payload
    ) external pure returns (TvmCell) {
        return abi.encode( base_token, name, symbol, decimals, amount, sol_amount, recipient, payload);
    }

    function encodeMultiVaultNativeSolanaEverscale(
        address token,
        uint128 amount,
        uint64 sol_amount,
        address recipient,
        bytes payload
    ) external pure returns (TvmCell) {
        return abi.encode(token, amount, sol_amount, recipient, payload);
    }

    function encodeAlienBurnPayloadSolana(
        uint256 recipient,
        IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[] executeAccounts
    ) external pure returns(TvmCell) {
        return abi.encode(recipient, executeAccounts);
    }

    function encodeNativeTransferPayloadSolana(
        uint256 recipient,
        IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[] executeAccounts
    ) external pure returns (TvmCell) {
        return abi.encode(recipient, executeAccounts);
    }

    function decodeMultiVaultAlienEverscaleSolana(
        TvmCell data
    ) external pure returns (
        uint256 base_token,
        uint128 amount,
        uint256 recipient
    ) {
        (base_token, amount, recipient) = abi.decode(
            data,
            (uint256, uint128, uint256)
        );
    }

    function decodeMultiVaultNativeEverscaleSolana(
        TvmCell data
    ) external pure returns(
        address token,
        string name,
        string symbol,
        uint8 decimals,
        uint128 amount,
        uint256 recipient
    ) {
        (token, name, symbol, decimals, amount, recipient) = abi.decode(
            data,
            (address, string, string, uint8, uint128, uint256)
        );
    }
}
