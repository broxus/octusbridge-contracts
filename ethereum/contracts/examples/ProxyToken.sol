pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../libraries/UniversalERC20.sol";
import "./../interfaces/IBridge.sol";
import "./../interfaces/IProxy.sol";
import "../utils/RedButton.sol";


/*
    This is an example of Ethereum Proxy contract, which allows to implement
    token transfers between Ethereum and TON with Broxus bridge.
    Each ProxyToken corresponds to a single token contract.
    Token has an admin, which can do whatever he want.
*/
contract ProxyToken is IProxy, RedButton {
    struct Configuration {
        address token;
        address bridge;
        bool active;
        uint16 requiredConfirmations;
    }

    Configuration public configuration;

    using UniversalERC20 for IERC20;

    constructor(
        Configuration memory _configuration,
        address _admin
    ) public {
        setConfiguration(_configuration);
        setAdmin(_admin);
    }

    /*
        Update proxy configuration
        @dev Only admin may call
    */
    function setConfiguration(Configuration memory _configuration) public onlyAdmin {
        configuration = _configuration;
    }

    // TODO: why uint128 amount?
    event TokenLock(uint128 amount, int8 wid, uint256 addr, uint256 pubkey);
    event TokenUnlock(uint128 amount, address addr);

    modifier onlyActive() {
        require(configuration.active, 'Configuration not active');
        _;
    }

    /*
        Lock tokens. Emit event that leads to the token minting on TON
        @param amount AMount of tokens to lock
        @param wid Workchain id of the receiver TON address
        @param addr Body of the receiver TON address
        @param pubkey TON pubkey, alternative way to receive
    */
    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey
    ) public onlyActive {
        require(
            IERC20(configuration.token).allowance(
                msg.sender,
                address(this)
            ) >= amount,
            "Allowance insufficient"
        );

        // Transfer tokens from user to the
        IERC20(configuration.token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit TokenLock(amount, wid, addr, pubkey);
    }

    /*
        Unlock tokens from the bridge
        @param payload Bytes encoded TONEvent structure
        @param signatures List of payload signatures
    */
    function broxusBridgeCallback(
        bytes memory payload,
        bytes[] memory signatures
    ) public onlyActive {
        require(
            IBridge(configuration.bridge).countRelaysSignatures(
                payload,
                signatures
            ) >= configuration.requiredConfirmations,
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

        IERC20(configuration.token).universalTransfer(addr, amount);

        emit TokenUnlock(amount, addr);
    }

    function bytesToAddress(bytes memory bys) private pure returns (address) {
        address addr;
        assembly {
            addr := div(mload(add(bys, 0x20)), 0x1000000000000000000000000)
        }
        return addr;
    }
}
