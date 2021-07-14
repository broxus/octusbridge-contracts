// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/ITokenLock.sol";
import "./interfaces/IBridge.sol";

import "./libraries/UniversalERC20.sol";

import "./utils/Cache.sol";


contract TokenLock is ITokenLock, Cache, OwnableUpgradeable {
    using UniversalERC20 for IERC20;

    uint32 constant public feeDenominator = 100000;
    uint32 constant public totalShares = 100000;

    Configuration public configuration;

    uint16 public lockedShares = 0;
    uint256 public lockedTokens = 0;
    uint256 public debtTokens = 0;

    mapping (address => Unlock[]) unlockOrders;
    mapping (address => TokenManagerConfiguration) tokenManagers;
    mapping (address => uint256) tokenManagerLockedTokens;

    modifier onlyActive() {
        require(configuration.active, 'Token lock: not active');
        _;
    }

    /// @dev Initializer
    /// @param admin Token lock admin
    /// @param _configuration Initial token lock configuration
    function initialize(
        address admin,
        Configuration calldata _configuration
    ) external initializer {
        __Ownable_init();
        transferOwnership(admin);

        _setConfiguration(_configuration);
    }

    /// @dev Set token lock configuration
    /// @param _configuration New configuration
    function setConfiguration(
        Configuration calldata _configuration
    ) override external onlyOwner {
        _setConfiguration(_configuration);
    }

    /// @dev Add new token manager
    /// @param manager Token manager address. Should not be added before.
    /// @param _configuration Token manager configuration
    function addTokenManager(
        address manager,
        TokenManagerConfiguration calldata _configuration
    ) external override onlyOwner {
        require(lockedShares + _configuration.share <= totalShares, 'Token lock: not enough shares');
        require(tokenManagers[manager].share == 0, 'Token lock: manager already exist');

        tokenManagers[manager] = _configuration;

        lockedShares += _configuration.share;

        emit AddTokenManager(manager, _configuration);
    }

    function updateTokenManager(
        address manager,
        TokenManagerConfiguration calldata _configuration
    ) external override onlyOwner {
        emit UpdateTokenManager(manager, _configuration);
    }

    function removeTokenManager(
        address manager
    ) external override onlyOwner {
        require(tokenManagers[manager].share != 0, 'Token lock: manager not exist');

        lockedShares -= tokenManagers[manager].share;

        delete tokenManagers[manager];

        emit RemoveTokenManager(manager);
    }

    /// @dev Check if address added as token manager
    /// @param manager Address to check
    /// @return bool Address is token manager or not
    function isTokenManager(
        address manager
    ) public view returns(bool) {
        return tokenManagers[manager].share > 0;
    }

    /// @dev Lock tokens on Ethereum side, so they can be transferred to FreeTON
    /// @dev Tokens in FreeTON could be received on public key OR address, not both
    /// @param amount Amount of tokens to lock. Should be approved
    /// @param wid Workchain id from receiver FreeTON address (before :)
    /// @param addr Body from receiver FreeTON address (after :)
    /// @param pubkey Receiver's FreeTON public key
    /// @param ids Unlock orders ids to be filled with this token lock.
    /// May produce additional reward for locker on the FreeTON side.
    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey,
        UnlockId[] calldata ids
    ) external override onlyActive {
        IERC20(configuration.token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        uint128 fee = getFee(amount, Operation.Lock);

        _sendFee(fee);

        lockedTokens += amount - fee;

        emit TokenLock(amount - fee, wid, addr, pubkey);

        for (uint32 i = 0; i < ids.length; i++) {
            _fillUnlockOrder(ids[i].receiver, ids[i].orderId);
        }
    }

    /// @dev Unlock tokens on Ethereum side. Each payload can be used only once.
    /// @dev If there're enough tokens on the token lock - unlock will be filled automatically.
    /// @dev Otherwise it will be placed in the heap of unlock orders.
    /// @param payload Bytes encoded IBridge.TONEvent structure
    /// @param signatures List of payload signatures, made by relays
    function unlockTokens(
        bytes calldata payload,
        bytes[] calldata signatures
    )
        external
        override
        onlyActive
        notCached(payload)
    {
        (IBridge.TONEvent memory _event) = abi.decode(
            payload,
            (IBridge.TONEvent)
        );

        require(
            IBridge(configuration.bridge).verifyRelaySignatures(
                _event.round,
                payload,
                signatures
            ),
            'Token lock: signature verification failed'
        );

        require(address(this) == _event.proxy, 'Token lock: wrong proxy');
        require(_event.chainId == 1, 'Token lock: Wrong chain id');

        (int8 ton_wid, uint256 ton_addr, uint128 amount, uint160 addr_n) = abi.decode(
            _event.eventData,
            (int8, uint256, uint128, uint160)
        );

        address receiver = address(addr_n);

        Unlock memory order = Unlock({
            amount: amount,
            filled: false
        });

        // TODO: save instantly?
        uint256 orderId = _saveUnlockOrder(receiver, order);

        if (amount <= status()) {
            _fillUnlockOrder(receiver, orderId);
        }
    }

    /// @dev Token lock status
    /// @return available How many tokens are available for unlock
    function status() public view returns (uint256 available) {
        available = IERC20(configuration.token).balanceOf(address(this));
    }

    /// @dev Get the manager token allocation
    /// @param manager Token manager address
    /// @return locked How much tokens are locked on a manager at this moment
    /// @return expected How much tokens should be locked on a manager
    function getTokenManagerTokens(
        address manager
    ) public view returns(uint256 locked, uint256 expected) {
        require(isTokenManager(manager), 'Token lock: not token manager');

        locked = tokenManagerLockedTokens[manager];
        expected = lockedTokens * tokenManagers[manager].share / totalShares;
    }

    /// @dev Get specific unlock order by it's receiver and index
    /// @param receiver Unlock receiver
    /// @param orderId Order ID
    /// @return order Unlock order
    function getUnlockOrder(
        address receiver,
        uint256 orderId
    ) public view returns (Unlock memory order) {
        return unlockOrders[receiver][orderId];
    }

    /// @dev Get all unlock orders by receiver
    /// @param receiver Unlock receiver
    /// @return orders List of receiver's unlock orders
    function getUnlockOrders(
        address receiver
    ) public view returns (Unlock[] memory orders) {
        return unlockOrders[receiver];
    }

    /// @dev Get fee amount according to the amount of tokens and operation type
    /// @param amount Amount of tokens to lock / unlock
    /// @param operation Operation type
    /// @return fee Fee amount
    function getFee(
        uint128 amount,
        Operation operation
    ) public view returns(uint128 fee) {
        if (operation == Operation.Lock) {
            fee = amount * configuration.lockFee / feeDenominator;
        } else {
            fee = amount * configuration.unlockFee / feeDenominator;
        }
    }

    function _saveUnlockOrder(
        address receiver,
        Unlock memory order
    ) internal returns(uint256 orderId) {
        unlockOrders[receiver].push(order);

        orderId = unlockOrders[receiver].length - 1;

        debtTokens += order.amount;

        emit UnlockOrder(receiver, orderId, order.amount);
    }

    function _sendFee(uint128 fee) internal {
        IERC20(configuration.token).transfer(configuration.feeReceiver, fee);
    }

    function _fillUnlockOrder(
        address receiver,
        uint256 orderId
    ) internal {
        Unlock memory order = getUnlockOrder(receiver, orderId);

        require(order.filled == false, 'Token lock: order already filled');

        uint128 fee = getFee(order.amount, Operation.Unlock);

        _sendFee(fee);

        lockedTokens -= order.amount;
        debtTokens -= order.amount;

        IERC20(configuration.token).universalTransfer(receiver, order.amount - fee);

        emit TokenUnlock(receiver, orderId, order.amount - fee);

        unlockOrders[receiver][orderId].filled = true;
    }

    function _setConfiguration(
        Configuration memory _configuration
    ) internal {
        configuration = _configuration;

        emit ConfigurationUpdate(_configuration);
    }
}
