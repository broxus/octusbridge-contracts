pragma ton-solidity >= 0.39.0;

import "./CellEncoder.sol";
import "./DaoCellEncoder.sol";
import "./TokenCellEncoder.sol";
import "./StakingCellEncoder.sol";
import '@broxus/contracts/contracts/utils/RandomNonce.sol';


contract CellEncoderStandalone is CellEncoder, DaoCellEncoder, TokenCellEncoder, StakingCellEncoder, RandomNonce {}
