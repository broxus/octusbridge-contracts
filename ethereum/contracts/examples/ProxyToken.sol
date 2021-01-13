pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


import "./../interfaces/IToken.sol";
import "./../interfaces/IBridge.sol";


/*
    This is an example of Ethereum Proxy contract, which allows to implement
    token transfers between Ethereum and TON with Broxus bridge.
    Each ProxyToken corresponds to a single
*/
contract ProxyToken {
    address public token;
    address public bridge;

    using UniversalERC20 for IToken;

    constructor(
        address _token,
        address _bridge
    ) public {
        token = _token;
        bridge = _bridge;
    }

    event TokenLock(uint amount, uint wid, uint addr);

    function lockTokens(uint amount, uint wid, uint addr) public {
        require(
            IToken(token).balanceOf(msg.sender) >= amount,
            "Token balance insufficient"
        );
        require(
            IToken(token).allowance(msg.sender, address(this)) >= amount,
            "Allowance insufficient"
        );

        // Transfer tokens from user to the
        IToken(token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit TokenLock(amount, wid, addr);
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

        (uint amount, address addr) = abi.decode(
            payload,
            (uint, address)
        );

        IToken(token).universalTransfer(addr, amount);
    }
}
