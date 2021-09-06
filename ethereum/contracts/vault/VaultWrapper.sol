// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "./../interfaces/IBridge.sol";
import "../utils/ChainId.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


interface IVault {
    struct TONAddress {
        int128 wid;
        uint256 addr;
    }

    function saveWithdraw(
        bytes32 id,
        address recipient,
        uint256 amount,
        uint256 bounty
    ) external;

    function configuration() external view returns(TONAddress memory _configuration);
    function bridge() external view returns(address);
}

contract VaultWrapper is ChainId, Initializable {
    address public vault;

    function initialize(
        address _vault
    ) initializer external {
        vault = _vault;
    }

    function saveWithdraw(
        bytes calldata payload,
        bytes[] calldata signatures,
        uint256 bounty
    ) external {
        address bridge = IVault(vault).bridge();

        // Check signatures correct
        require(
            IBridge(bridge).verifySignedTonEvent(
                payload,
                signatures
            ) == 0,
            "Vault wrapper: signatures verification failed"
        );

        // Decode TON event
        (IBridge.TONEvent memory tonEvent) = abi.decode(payload, (IBridge.TONEvent));

        // Check event proxy is correct
        require(
            tonEvent.proxy == vault,
            "Vault wrapper: wrong event proxy"
        );

        // dev: fix stack too deep
        {
            // Check event configuration matches Vault's configuration
            IVault.TONAddress memory configuration = IVault(vault).configuration();

            require(
                tonEvent.configurationWid == configuration.wid &&
                tonEvent.configurationAddress == configuration.addr,
                "Vault wrapper: wrong event configuration"
            );
        }

        // Decode event data
        (
            int8 sender_wid,
            uint256 sender_addr,
            uint128 amount,
            uint160 _recipient,
            uint32 chainId
        ) = abi.decode(
            tonEvent.eventData,
            (int8, uint256, uint128, uint160, uint32)
        );

        // Check chain id
        require(chainId == getChainID(), "Vault wrapper: wrong chain id");

        address recipient = address(_recipient);

        IVault(vault).saveWithdraw(
            keccak256(payload),
            recipient,
            amount,
            recipient == msg.sender ? bounty : 0
        );
    }
}
