pragma ton-solidity >= 0.39.0;

import "./ProxyTokenTransferCellEncoder.sol";
import "./ProxyMultiVaultCellEncoder.sol";
import "./DaoCellEncoder.sol";
import "./TokenCellEncoder.sol";
import "./StakingCellEncoder.sol";
import "./MergePoolCellEncoder.sol";

import '@broxus/contracts/contracts/utils/RandomNonce.sol';


contract CellEncoderStandalone is
    ProxyTokenTransferCellEncoder,
    ProxyMultiVaultCellEncoder,
    DaoCellEncoder,
    TokenCellEncoder,
    StakingCellEncoder,
    MergePoolCellEncoder,
    RandomNonce
{

}
