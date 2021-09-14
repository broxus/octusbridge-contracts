pragma ton-solidity >= 0.39.0;

import "../../dao/structures/ActionStructure.sol";

contract DaoCellEncoder {
    function encodeDaoEthereumActionData(
        int8 gasBackWid,
        uint256 gasBackAddress,
        uint32 chainId,
        ActionStructure.EthActionStripped[] actions
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;
        builder.store(gasBackWid, gasBackAddress, chainId, actions);
        data = builder.toCell();
    }

    function decodeDaoEthereumActionData(
        TvmCell data
    ) public pure returns(
        int8 gasBackWid,
        uint256 gasBackAddress,
        uint32 chainId,
        ActionStructure.EthActionStripped[] actions
    ) {
        (
            gasBackWid,
            gasBackAddress,
            chainId,
            actions
        ) = data.toSlice().decode(int8, uint256, uint32, ActionStructure.EthActionStripped[]);
    }
}
