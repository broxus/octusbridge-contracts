// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/ITokenLock.sol";
import "./interfaces/IBridge.sol";
import "./interfaces/ITokenManager.sol";

import "./libraries/UniversalERC20.sol";

import "./utils/Cache.sol";
import "./utils/ChainId.sol";


// TODO: think about syncing with actual token balance
contract TokenLock is ITokenLock, Cache, OwnableUpgradeable, ChainId {
    using UniversalERC20 for IERC20;

    uint32 constant public shares = 100000;

    uint256 public lockedShares = 0;
    uint256 public lockedTokens = 0;
    uint256 public debtTokens = 0;

    Configuration public configuration;

    mapping (address => Unlock[]) unlockOrders;
    mapping (address => TokenManagerConfiguration) tokenManagers;
    mapping (address => uint256) tokenManagerBalance;

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
        require(lockedShares + _configuration.share <= shares, 'Token lock: not enough shares');
        require(tokenManagers[manager].share == 0, 'Token lock: manager already exist');

        tokenManagers[manager] = _configuration;

        lockedShares += _configuration.share;

        emit AddTokenManager(manager, _configuration);
    }

    /// @dev Update token manager configuration
    /// @param manager Token manager address
    /// @param _configuration New token manager configuration
    function updateTokenManager(
        address manager,
        TokenManagerConfiguration calldata _configuration
    ) external override onlyOwner {
        emit UpdateTokenManager(manager, _configuration);
    }

    /// @dev Remove token manager
    /// @param manager Token manager address
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

    /// @dev Get token manager status
    /// @param manager Token manager
    /// @return locked How many tokens are currently locked on the manager
    /// @return expected How many tokens are expected to be locked on the manager.
    /// May be more or less than current `locked` in case token lock has
    /// received / spent tokens since last sync.
    function tokenManagerStatus(
        address manager
    ) public view returns(
        uint256 locked,
        uint256 expected
    ) {
        require(isTokenManager(manager), 'Token lock: not a token manager');

        locked = tokenManagerBalance[manager];
        expected = (lockedTokens - debtTokens) / shares * tokenManagers[manager].share;
    }

    /// @dev Lock tokens on Ethereum side, so they can be transferred to FreeTON.
    /// Tokens in FreeTON could be received on public key OR address, not both
    /// @param amount Amount of tokens to lock. Should be approved before
    /// @param wid Workchain id from receiver FreeTON address (before :)
    /// @param addr Body from receiver FreeTON address (after :)
    /// @param pubkey Receiver's FreeTON public key
    /// @param tokenManagersToSync Token managers to sync
    /// @param ids Unlock orders ids to be filled with this token lock.
    /// Each filled order increases amount minted on FreeTON with order.fee.
    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey,
        address[] memory tokenManagersToSync,
        UnlockId[] calldata ids
    ) external override onlyActive {
        IERC20(configuration.token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        lockedTokens += amount;

        for (uint32 i = 0; i < tokenManagersToSync.length; i++) {
            _syncTokenManager(tokenManagersToSync[i]);
        }

        uint128 fillReward = 0;

        for (uint32 i = 0; i < ids.length; i++) {
            _fillUnlockOrder(ids[i].receiver, ids[i].orderId);

            Unlock memory order = getUnlockOrder(ids[i].receiver, ids[i].orderId);

            fillReward += order.fee;
        }

        emit TokenLock(amount + fillReward, wid, addr, pubkey);
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

        (int8 ton_wid, uint256 ton_addr, uint128 amount, uint128 fee, uint160 addr_n, uint32 chainId) = abi.decode(
            _event.eventData,
            (int8, uint256, uint128, uint128, uint160, uint32)
        );

        require(chainId == getChainID(), 'Token lock: Wrong chain id');

        address receiver = address(addr_n);

        Unlock memory order = Unlock({
            amount: amount,
            fee: fee,
            filled: false,
            exist: true
        });

        uint256 orderId = _saveUnlockOrder(receiver, order);

        if (amount <= status()) {
            _fillUnlockOrder(receiver, orderId);
        }
    }

    /// @dev Update fee size for already created unlock orders.
    /// Only order receiver can update order's fee.
    /// Allows to update multiple order's fees at the same time.
    /// Fee should be less than order amount.
    /// @param ids Unlock orders ids
    /// @param fees New fees for each order
    function updateUnlockFees(
        uint256[] calldata ids,
        uint128[] calldata fees
    ) external {
        require(ids.length == fees.length, 'Token lock: wrong syntax');

        for (uint32 i = 0; i < ids.length; i++) {
            require(checkOrderExists(msg.sender, ids[i]), 'Token lock: order not exists');
            require(getUnlockOrder(msg.sender, ids[i]).amount > fees[i], 'Token lock: too high fee');

            unlockOrders[msg.sender][i].fee = fees[i];
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
    function getTokenManagerStatus(
        address manager
    ) public view returns(uint256, uint256) {
        require(isTokenManager(manager), 'Token lock: not token manager');

        uint256 locked = tokenManagerBalance[manager];
        uint256 expected = (lockedTokens - debtTokens) * tokenManagers[manager].share / shares;

        return (locked, expected);
    }

    /// @dev Check order exists
    /// @param receiver Order receiver
    /// @param id Order id
    /// @return Boolean, exists or not
    function checkOrderExists(
        address receiver,
        uint256 id
    ) public view returns(bool) {
        Unlock memory order = getUnlockOrder(receiver, id);

        return order.exist == true;
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

    function _saveUnlockOrder(
        address receiver,
        Unlock memory order
    ) internal returns(uint256 orderId) {
        unlockOrders[receiver].push(order);

        orderId = unlockOrders[receiver].length - 1;

        debtTokens += order.amount;

        emit UnlockOrder(receiver, orderId, order.amount);
    }

    function _fillUnlockOrder(
        address receiver,
        uint256 orderId
    ) internal {
        Unlock memory order = getUnlockOrder(receiver, orderId);

        require(order.filled == false, 'Token lock: order already filled');

        lockedTokens -= order.amount;
        debtTokens -= order.amount;

        IERC20(configuration.token).universalTransfer(receiver, order.amount);

        emit TokenUnlock(receiver, orderId, order.amount);

        unlockOrders[receiver][orderId].filled = true;
    }

    function _setConfiguration(
        Configuration memory _configuration
    ) internal {
        configuration = _configuration;

        emit ConfigurationUpdate(_configuration);
    }

    function _syncTokenManager(
        address manager
    ) internal {
        ITokenManager(manager).sync();
    }
}
