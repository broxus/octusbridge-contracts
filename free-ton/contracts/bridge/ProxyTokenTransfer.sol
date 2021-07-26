pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


/// @title Proxy for cross chain token transfers
/// @dev In case of ETH-TON token transfer, this proxy should receive
/// callback from the corresponding EthereumEventConfiguration. After that it mints
/// the specified amount of tokens to the user.
/// In case of TON-ETH token transfer, this proxy should receive burn callback from the token
/// and emit TokenBurn event, which will be signed and then sent to the corresponding EVM network.
contract ProxyTokenTransfer {
    event TokenBurn(
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint160 ethereum_address,
        uint32 chainId
    );

    function burnCallback() external {

    }

    function broxusBridgeCallback() external {

    }
}
