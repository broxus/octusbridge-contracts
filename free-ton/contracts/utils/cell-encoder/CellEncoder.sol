pragma ton-solidity >= 0.39.0;


/*
    Ad hoc contract, used to perform encode / decode TvmCell.
    Not implemented in the TON-SDK at the moment of creation.
    @important Not strictly connected to the ERC20<->TIP3 token transfers, just an example.
*/
contract CellEncoder {
    function encodeEthereumEventData(
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;

        builder.store(tokens, wid, owner_addr, owner_pubkey);

        data = builder.toCell();
    }

    function decodeEthereumEventData(
        TvmCell data
    ) public pure returns(
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey
    ) {
        (
            tokens,
            wid,
            owner_addr,
            owner_pubkey
        ) = data.toSlice().decode(uint128, int8, uint256, uint256);
    }

    function encodeConfigurationMeta(
        address rootToken
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;

        builder.store(rootToken);

        data = builder.toCell();
    }

    function decodeConfigurationMeta(
        TvmCell data
    ) public pure returns(
        address rootToken
    ) {
        (rootToken) = data.toSlice().decode(address);
    }

    function encodeTonEventData(
        int8 wid,
        uint addr,
        uint128 tokens,
        uint160 ethereum_address,
        uint32 chainId
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;

        uint32 zero_event_id = 0;

        builder.store(zero_event_id, wid, addr, tokens, ethereum_address, chainId);

        data = builder.toCell();
    }

    function decodeTonEventData(
        TvmCell data
    ) public pure returns(
        int8 wid,
        uint addr,
        uint128 tokens,
        uint160 ethereum_address,
        uint32 chainId
    ) {
        (
            , // event_id
            wid,
            addr,
            tokens,
            ethereum_address,
            chainId
        ) = data.toSlice().decode(uint32, int8, uint, uint128, uint160, uint32);
    }

    function encodeBurnPayload(
        uint160 ethereumAddress,
        uint32 chainId
    ) public pure returns(
        TvmCell data
    ) {
        TvmBuilder builder;

        builder.store(ethereumAddress, chainId);

        data = builder.toCell();
    }

    function decodeBurnPayload(
        TvmCell data
    ) public pure returns(
        uint160 ethereumAddress,
        uint32 chainId
    ) {
        (ethereumAddress, chainId) = data.toSlice().decode(uint160, uint32);
    }
}
