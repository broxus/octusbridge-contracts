// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;


interface ITokenLock {
    struct Unlock {
        uint128 amount;
        uint128 fee;
        bool filled;
        bool exist;
    }

    struct UnlockId {
        address receiver;
        uint256 orderId;
    }

    struct TokenManagerConfiguration {
        uint16 share;
    }

    enum TokenManagerStatus { Synced, Deficit, Proficit }

    function token() external returns(address);
    function bridge() external returns(address);

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

    function addTokenManager(address manager, TokenManagerConfiguration calldata _configuration) external;
    function removeTokenManager(address manager) external;
    function updateTokenManager(address manager, TokenManagerConfiguration calldata _configuration) external;

    function getTokenManagerStatus(address manager) external
        returns (ITokenLock.TokenManagerStatus status, uint256 tokens);
    function payDeficit(address manager, uint tokens) external;
    function requestProficitApprove(address manager) external;

    event AddTokenManager(address indexed manager, TokenManagerConfiguration configuration);
    event RemoveTokenManager(address indexed manager);
    event UpdateTokenManager(address indexed manager, TokenManagerConfiguration configuration);

    event TokenLock(uint128 amount, int8 wid, uint256 addr, uint256 pubkey);
    event TokenUnlock(address indexed receiver, uint256 indexed id, uint128 amount);
    event UnlockOrder(address indexed receiver, uint256 indexed id, uint128 amount);
}
