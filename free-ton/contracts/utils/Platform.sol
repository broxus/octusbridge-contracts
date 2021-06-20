pragma ton-solidity ^0.39.0;

import "../../../node_modules/@broxus/contracts/contracts/platform/Platform.sol";

contract RPlatform is Platform {
    constructor(TvmCell code, TvmCell params, address sendGasTo) public Platform(code, params, sendGasTo) {}
}
