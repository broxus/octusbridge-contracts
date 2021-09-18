// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./../interfaces/IBridge.sol";
import "./../interfaces/IVault.sol";
import "../utils/ChainId.sol";


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract VaultWrapper is ChainId, Initializable {
    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    address public vault;

    function initialize(
        address _vault
    ) external initializer {
        vault = _vault;
    }

    function deposit(
        IVault.TONAddress memory recipient,
        uint256 amount
    ) external {
        IVault(vault).deposit(
            msg.sender,
            recipient,
            amount,
            ZERO_ADDRESS
        );
    }

    function depositWithFillings(
        IVault.TONAddress calldata recipient,
        uint256 amount,
        address[] calldata pendingWithdrawalsToFill
    ) external {
        require(pendingWithdrawalsToFill.length > 0, 'Wrapper: no pending withdrawals');

        for (uint i = 0; i < pendingWithdrawalsToFill.length; i++) {
            IVault(vault).deposit(
                msg.sender,
                recipient,
                amount,
                pendingWithdrawalsToFill[i]
            );
        }
    }

    function decodeWithdrawEventData(
        bytes memory payload
    ) public pure returns (
        int8 sender_wid,
        uint256 sender_addr,
        uint128 amount,
        uint160 _recipient,
        uint32 chainId
    ) {
        (IBridge.TONEvent memory tonEvent) = abi.decode(payload, (IBridge.TONEvent));

        return abi.decode(
            tonEvent.eventData,
            (int8, uint256, uint128, uint160, uint32)
        );
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
        ) = decodeWithdrawEventData(payload);

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
