// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;


interface ITokenLock {
    struct Configuration {
        bool active;
        address bridge;
        address token;
        uint32 lockFee;
        uint32 unlockFee;
        address feeReceiver;
    }

    struct Unlock {
        uint128 amount;
        bool filled;
    }

    struct UnlockId {
        address receiver;
        uint256 orderId;
    }

    struct TokenManagerConfiguration {
        uint16 share;
    }

    enum Operation { Lock, Unlock }

    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey,
        UnlockId[] calldata ids
    ) external;

    function unlockTokens(
        bytes memory payload,
        bytes[] memory signatures
    ) external;

    function setConfiguration(Configuration calldata _configuration) external;

    function addTokenManager(address manager, TokenManagerConfiguration calldata _configuration) external;
    function removeTokenManager(address manager) external;
    function updateTokenManager(address manager, TokenManagerConfiguration calldata _configuration) external;

    event AddTokenManager(address indexed manager, TokenManagerConfiguration configuration);
    event RemoveTokenManager(address indexed manager);
    event UpdateTokenManager(address indexed manager, TokenManagerConfiguration configuration);

    event TokenLock(uint128 amount, int8 wid, uint256 addr, uint256 pubkey);
    event TokenUnlock(address indexed receiver, uint256 indexed id, uint128 amount);
    event UnlockOrder(address indexed receiver, uint256 indexed id, uint128 amount);

    event ConfigurationUpdate(Configuration configuration);
}
