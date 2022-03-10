// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../interfaces/multivault/IMultiVault.sol";
import "./../interfaces/IEverscale.sol";


library MultiVaultLibrary {
    function decodeWithdrawalEventData(
        bytes memory eventData
    ) internal pure returns (IMultiVault.WithdrawalParams memory) {
        (
            IMultiVault.DepositType depositType,
            IMultiVault.TokenType source_type,
            bytes memory source_meta,

            string memory name,
            string memory symbol,
            uint8 decimals,

            int8 sender_wid,
            uint256 sender_addr,

            uint128 amount,
            uint160 recipient,
            uint256 chainId
        ) = abi.decode(
            eventData,
            (
                IMultiVault.DepositType,
                IMultiVault.TokenType, bytes,
                string, string, uint8,
                int8, uint256,
                uint128, uint160, uint256
            )
        );

        return IMultiVault.WithdrawalParams({
            depositType: depositType,
            source: IMultiVault.TokenSource(source_type, source_meta),
            meta: IMultiVault.TokenMeta(name, symbol, decimals),
            sender: IEverscale.EverscaleAddress(sender_wid, sender_addr),
            amount: amount,
            recipient: address(recipient),
            chainId: chainId
        });
    }

    /// @notice Decode token source meta for EVM token
    /// @param meta Token source meta
    /// @return chainId Token's chain ID
    /// @return token Token address
    function decodeEvmTokenSourceMeta(
        bytes memory meta
    ) internal pure returns (uint32 chainId, address token) {
        (chainId, token) = abi.decode(
            meta,
            (uint32, address)
        );
    }

    /// @notice Encode token source meta for EVM token
    /// @param chainId Token's chain ID
    /// @param token Token address
    /// @return meta Token source meta
    function encodeEvmTokenSourceMeta(
        uint256 chainId,
        address token
    ) internal pure returns (bytes memory meta) {
        meta = abi.encodePacked(chainId, token);
    }

    /// @notice Calculates the CREATE2 address for token, based on it's source type and meta
    /// @param _type Token source type
    /// @param meta Token source meta
    /// @return token Token address
    function tokenFor(
        IMultiVault.TokenType _type,
        bytes memory meta
    ) public returns (address token) {
        token = address(uint160(uint(keccak256(abi.encodePacked(
                hex'ff',
                address(this),
                keccak256(abi.encodePacked(_type, meta)),
                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // MultiVaultToken init code hash
            )))));
    }
}