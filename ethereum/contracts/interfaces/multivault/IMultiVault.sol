// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "../IEverscale.sol";


interface IMultiVault is IEverscale {
    enum Fee { Deposit, Withdraw }
    enum DepositType { Store, Burn }

    enum TokenType { EVM, Solana }

    struct TokenSource {
        TokenType _type;
        bytes meta;
    }

    struct TokenMeta {
        string name;
        string symbol;
        uint8 decimals;
    }

    struct Token {
        uint activation;
        bool blacklisted;
        TokenSource source;
        TokenMeta meta;
        uint depositFee;
        uint withdrawFee;
    }

    struct WithdrawalParams {
        DepositType depositType;
        TokenSource source;
        TokenMeta meta;
        EverscaleAddress sender;
        uint256 amount;
        address recipient;
        uint256 chainId;
    }

    function defaultDepositFee() external view returns (uint);
    function defaultWithdrawFee() external view returns (uint);

    function apiVersion() external view returns (string memory api_version);

    function initialize(
        address _bridge,
        address _governance,
        EverscaleAddress memory _rewards
    ) external;

    function blacklistAddToken(address token) external;
    function blacklistRemoveToken(address token) external;

    function setTokenDepositFee(address token, uint _depositFee) external;
    function setTokenWithdrawFee(address token, uint _withdrawFee) external;

    function setDefaultDepositFee(uint _defaultDepositFee) external;
    function setDefaultWithdrawFee(uint _defaultWithdrawFee) external;

    function rewards() external view returns (EverscaleAddress memory);
    function configuration() external view returns (EverscaleAddress memory);
    function withdrawalIds(bytes32) external view returns (bool);
    function bridge() external view returns(address);

    function governance() external view returns (address);
    function guardian() external view returns (address);
    function management() external view returns (address);

    function emergencyShutdown() external view returns (bool);
    function setEmergencyShutdown(bool active) external;

    function setConfiguration(EverscaleAddress memory _configuration) external;
    function setGovernance(address _governance) external;
    function acceptGovernance() external;
    function setGuardian(address _guardian) external;
    function setManagement(address _management) external;
    function setRewards(EverscaleAddress memory _rewards) external;
    function setBridge(address _bridge) external;

    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint amount,
        DepositType depositType
    ) external;

    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures
    ) external;

    function migrateTokenToVault(
        address token,
        address vault
    ) external;

    event BlacklistTokenAdded(address token);
    event BlacklistTokenRemoved(address token);

    event UpdateDefaultDepositFee(uint fee);
    event UpdateDefaultWithdrawFee(uint fee);

    event UpdateBridge(address bridge);
    event UpdateConfiguration(int128 wid, uint256 addr);
    event UpdateRewards(int128 wid, uint256 addr);

    event UpdateTokenDepositFee(address token, uint256 fee);
    event UpdateTokenWithdrawFee(address token, uint256 fee);

    event UpdateGovernance(address governance);
    event UpdateManagement(address management);
    event NewPendingGovernance(address governance);
    event UpdateGuardian(address guardian);

    event EmergencyShutdown(bool active);

    event TokenMigrated(address token, address vault);
    event TokenInitialized(
        address token,
        uint activation,
        TokenType _type,
        bytes meta,
        string name,
        string symbol,
        uint8 decimals,
        uint depositFee,
        uint withdrawFee
    );
    event TokenCreated(
        address token,
        TokenType _type,
        bytes meta,
        string name,
        string symbol,
        uint8 decimals
    );

    event Deposit(
        DepositType depositType,
        TokenType _type,
        bytes meta,
        string name,
        string symbol,
        uint8 decimals,
        uint256 amount,
        int128 wid,
        uint256 addr
    );
}