pragma ton-solidity >= 0.39.0;

import "../../bridge/interfaces/event-contracts/IEverscaleSolanaEvent.sol";

contract TokenCellEncoder {
    function encodeEthereumBurnPayload(
        uint160 ethereumAddress,
        uint32 chainId
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;

        builder.store(ethereumAddress, chainId);

        data = builder.toCell();
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
        TvmBuilder builder;

        builder.store(solanaOwnerAddress);
        builder.store(executeAccounts);

        data = builder.toCell();
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
