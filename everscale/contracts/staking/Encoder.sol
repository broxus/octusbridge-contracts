pragma ton-solidity >= 0.57.0;

contract Encoder {
    constructor() public {
        tvm.accept();
    }

    function encode_uint8(uint8 num) external responsible pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(num);
        return builder.toCell();
    }

    function encodeEthereumEverscaleStakingEventData(uint160 eth_addr, int8 wk_id, uint256 ton_addr_body) public pure returns (TvmCell data) {
        TvmBuilder builder;
        builder.store(eth_addr);
        builder.store(wk_id);
        builder.store(ton_addr_body);
        return builder.toCell();
    }

}
