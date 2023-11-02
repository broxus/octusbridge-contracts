// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;



import "./bridge/IBridge.sol";


interface IDAO {
    struct EthAction {
        uint value;
        uint160 target;
        string signature;
        bytes data;
    }

    function setConfiguration(
        IBridge.EverscaleAddress calldata _configuration
    ) external;

    function decodeEthActionsEventData(
        bytes memory payload
    ) external pure returns (
        int8 _wid,
        uint256 _addr,
        uint32 chainId,
        EthAction[] memory actions
    );
 
    function setBridge(
        address _bridge
    ) external;

    function execute(
        bytes memory payload,
        bytes[] memory signatures
    ) external returns (bytes[] memory responses);

    event UpdateBridge(address indexed bridge);
    event UpdateConfiguration(IBridge.EverscaleAddress configuration);
}
