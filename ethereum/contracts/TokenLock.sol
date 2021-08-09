// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/ITokenLock.sol";
import "./interfaces/IBridge.sol";
import "./interfaces/ITokenManager.sol";

import "./libraries/UniversalERC20.sol";

import "./utils/Cache.sol";
import "./utils/ChainId.sol";


// TODO: think about syncing with actual token balance
contract TokenLock is ITokenLock, ReentrancyGuard, OwnableUpgradeable, PausableUpgradeable, Cache, ChainId {
    using UniversalERC20 for IERC20;

    address public override bridge;
    address public override token;

    uint32 constant public shares = 100000;

    uint256 public lockedShares = 0;
    uint256 public lockedTokens = 0;
    uint256 public debtTokens = 0;

    mapping (address => Unlock[]) unlockOrders;
    mapping (address => TokenManagerConfiguration) public tokenManagers;
    mapping (address => uint256) tokenManagerLocked;


    /// @dev Initializer
    /// @param admin Token lock admin
    /// @param _token Token
    /// @param _bridge Bridge
    function initialize(
        address admin,
        address _token,
        address _bridge
    ) external initializer {
        __Ownable_init();
        __Pausable_init();

        transferOwnership(admin);

        token = _token;
        bridge = _bridge;
    }

    /// @dev Pause contract.
    /// Disable locking and unlocking tokens
    function pause() onlyOwner whenNotPaused external {
        _pause();
    }

    /// @dev Unpause contract.
    /// Enable locking and unlocking tokens
    function unpause() onlyOwner whenPaused external {
        _unpause();
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
        require(tokenManagers[manager].share == 0, 'Token lock: manager already exist');

        tokenManagers[manager] = _configuration;

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

    /// @dev Lock tokens on Ethereum side, so they can be transferred to FreeTON.
    /// Tokens in FreeTON could be received on public key OR address, not both
    /// @param amount Amount of tokens to lock. Should be approved before
    /// @param wid Workchain id from receiver FreeTON address (before :)
    /// @param addr Body from receiver FreeTON address (after :)
    /// @param pubkey Receiver's FreeTON public key
    /// @param ids Unlock orders ids to be filled with this token lock.
    /// Each filled order increases amount minted on FreeTON with order.fee.
    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey,
        UnlockId[] calldata ids
    ) external override whenNotPaused {
        IERC20(token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        lockedTokens += amount;

        uint128 fillReward = 0;

        for (uint32 i = 0; i < ids.length; i++) {
            _fillUnlockOrder(ids[i].receiver, ids[i].orderId, false);

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
        whenNotPaused
        notCached(payload)
    {
        (IBridge.TONEvent memory _event) = abi.decode(
            payload,
            (IBridge.TONEvent)
        );

        require(
            IBridge(bridge).verifyRelaySignatures(
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

        if (amount <= balance()) {
            _fillUnlockOrder(receiver, orderId, true);
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

    /// @dev Token lock balance
    /// @return Token lock balance
    function balance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @dev Get the manager token allocation
    /// @param manager Token manager address
    /// @return status How much tokens are locked on a manager at this moment
    /// @return tokens Token lock
    function getTokenManagerStatus(
        address manager
    ) public override view returns (
        TokenManagerStatus status,
        uint256 tokens
    ) {
        require(isTokenManager(manager), 'Token lock: not token manager');

        uint256 locked = tokenManagerLocked[manager];
        uint256 expected = (lockedTokens - debtTokens) * tokenManagers[manager].share / shares;

        if (locked == expected) {
            status = TokenManagerStatus.Synced;
            tokens = 0;
        } else if (locked > expected) {
            status = TokenManagerStatus.Deficit;
            tokens = locked - expected;
        } else {
            status = TokenManagerStatus.Proficit;
            tokens = expected - locked;
        }
    }

    function payDeficit(address manager, uint tokens) override external {

    }

    function requestProficitApprove(address manager) override external {
        (TokenManagerStatus status, uint tokens) = getTokenManagerStatus(manager);

        require(status == TokenManagerStatus.Proficit, 'Token lock: token manager should be in profit');

        IERC20(token).approve(manager, tokens);
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
        uint256 orderId,
        bool ignoreFee
    ) internal {
        Unlock memory order = getUnlockOrder(receiver, orderId);

        require(order.filled == false, 'Token lock: order already filled');

        uint128 fee;

        if (ignoreFee) {
            fee = 0;
        } else {
            fee = order.fee;
        }

        lockedTokens -= order.amount - fee;
        debtTokens -= order.amount;

        IERC20(token).universalTransfer(receiver, order.amount - fee);

        emit TokenUnlock(receiver, orderId, order.amount - fee);

        unlockOrders[receiver][orderId].filled = true;
    }

    function _syncTokenManager(
        address manager
    ) internal {
        ITokenManager(manager).sync();
    }
}
