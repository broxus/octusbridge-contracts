pragma ton-solidity >= 0.39.0;

import "./../../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";


contract ProxyMultiVaultCellEncoder {
    function encodeMultiVaultAlienEVMEverscale(
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

    function encodeMultiVaultNativeEVMEverscale(
        int8 token_wid,
        uint256 token_addr,
        uint128 amount,
        int8 recipient_wid,
        uint256 recipient_addr
    ) external pure returns (TvmCell) {
        return abi.encode(token_wid, token_addr, amount, recipient_wid, recipient_addr);
    }

    function encodeAlienBurnPayloadEthereum(
        uint160 recipient
    ) external pure returns(TvmCell) {
        return abi.encode(recipient);
    }

    function encodeNativeTransferPayloadEthereum(
        uint160 recipient,
        uint256 chainId
    ) external pure returns (TvmCell) {
        return abi.encode(recipient, chainId);
    }

    function decodeMultiVaultAlienEverscaleEthereum(
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
        uint256 chainId
    ) {
        (token_wid, token_addr, name, symbol, decimals, amount, recipient, chainId) = abi.decode(
            data,
            (int8, uint256, string, string, uint8, uint128, uint160, uint256)
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