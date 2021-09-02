pragma ton-solidity >= 0.39.0;

contract Encoder {
    constructor() public {
        tvm.accept();
    }

    function encode_uint8(uint8 num) external responsible pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(num);
        return builder.toCell();
    }

}
