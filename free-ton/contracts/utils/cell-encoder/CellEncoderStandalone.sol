pragma ton-solidity >= 0.39.0;

import "./CellEncoder.sol";
import './../../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol';


contract CellEncoderStandalone is CellEncoder, RandomNonce {}
