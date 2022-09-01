pragma ton-solidity >= 0.39.0;

import "./../../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";
//import "./../../bridge/interfaces/IProxyTokenTransfer.sol";
import "./../../bridge/libraries/BurnType.sol";

contract TokenCellEncoder {
    function encodeEthereumBurnPayload(
        uint160 ethereumAddress,
        uint32 chainId
    ) public pure returns(
        TvmCell data
    ) {
        TvmCell burnPayload = abi.encode(ethereumAddress, chainId);

        data = abi.encode(BurnType.EVM, burnPayload);
    }

    function decodeEthereumBurnPayload(
        TvmCell data
    ) public pure returns(
        uint160 ethereumAddress,
        uint32 chainId
    ) {
        (ethereumAddress, chainId) = data.toSlice().decode(uint160, uint32);
    }

    function encodeSolanaBurnPayload(
        uint256 solanaOwnerAddress,
        IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[] executeAccounts
    ) public pure returns(
        TvmCell data
    ) {
        TvmCell burnPayload = abi.encode(solanaOwnerAddress, executeAccounts);

        data = abi.encode(BurnType.Solana, burnPayload);
    }

    function decodeSolanaBurnPayload(
        TvmCell data
    ) public pure returns(
        uint256 solanaOwnerAddress,
        IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[] executeAccounts
    ) {
        (solanaOwnerAddress, executeAccounts) = data.toSlice().decode(uint256, IEverscaleSolanaEvent.EverscaleSolanaExecuteAccount[]);
    }
}
