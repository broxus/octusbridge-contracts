pragma ton-solidity >= 0.39.0;


contract StakingCellEncoder {
    function decodeTonStakingEventData(TvmCell data) public pure returns(uint32 round_num, uint160[] eth_keys, uint32 round_end) {
        TvmSlice _slice = data.toSlice();
        round_num = _slice.decode(uint32);
        eth_keys = _slice.decode(uint160[]);
        round_end = _slice.decode(uint32);
        return (round_num, eth_keys, round_end);
    }

    function decodeEthereumStakingEventData(TvmCell data) public pure returns(uint160 eth_addr, int8 wk_id, uint256 ton_addr_body) {
        (eth_addr, wk_id, ton_addr_body) = data.toSlice().decode(uint160, int8, uint256);
        return (eth_addr, wk_id, ton_addr_body);
    }

    function encodeEthereumStakingEventData(uint160 eth_addr, int8 wk_id, uint256 ton_addr_body) public pure returns (TvmCell data) {
        TvmBuilder builder;
        builder.store(eth_addr);
        builder.store(wk_id);
        builder.store(ton_addr_body);
        return builder.toCell();
    }
}
