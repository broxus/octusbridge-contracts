pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../libraries/UniversalERC20.sol";
import "./../interfaces/IBridge.sol";
import "./../interfaces/IProxy.sol";

/*
    This is an example of Ethereum Proxy contract, which allows to implement
    token transfers between Ethereum and TON with Broxus bridge.
    Each ProxyToken corresponds to a single
*/
contract ProxyToken is IProxy {
    address public token;
    address public bridge;

    using UniversalERC20 for IERC20;

    constructor(
        address _token,
        address _bridge
    ) public {
        token = _token;
        bridge = _bridge;
    }

    event TokenLock(uint128 amount, int8 wid, uint256 addr, uint256 pubkey);

    function lockTokens(uint128 amount, int8 wid, uint256 addr, uint256 pubkey) public {
        require(
            IERC20(token).balanceOf(msg.sender) >= amount,
            "Token balance insufficient"
        );
        require(
            IERC20(token).allowance(msg.sender, address(this)) >= amount,
            "Allowance insufficient"
        );

        // Transfer tokens from user to the
        IERC20(token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit TokenLock(amount, wid, addr, pubkey);
    }

    function broxusBridgeCallback(
        bytes memory payload,
        bytes[] memory signatures
    ) public {
        require(
            IBridge(bridge).countRelaysSignatures(
                payload,
                signatures
            ) >= 2,
            'Not enough relays signed'
        );

        (TONEvent memory _event) = abi.decode(
            payload,
            (TONEvent)
        );

        (uint128 amount, bytes memory addr_bytes) = abi.decode(
            _event.eventData,
            (uint128, bytes)
        );

        address addr = bytesToAddress(addr_bytes);

        IERC20(token).universalTransfer(addr, amount);
    }

    function bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
            addr := mload(add(bys,20))
        }
    }
}
