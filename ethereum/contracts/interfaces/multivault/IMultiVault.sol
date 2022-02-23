// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;

import "../IEverscale.sol";


interface IMultiVault is IEverscale {
    struct WithdrawalParams {
        EverscaleAddress sender;
        address token;
        uint256 amount;
        address recipient;
        uint32 chainId;
    }

    struct TokenMeta {
        string symbol;
        string name;
        uint8 decimals;
    }

    function apiVersion() external view returns (string memory api_version);

    function initialize(
        address _bridge,
        address _governance,
        EverscaleAddress memory _rewards
    ) external;

    function enableToken(
        address token,
        uint _depositFee,
        uint _withdrawFee
    ) external;

    function disableToken(
        address token
    ) external;

    function setDepositFee(
        address token,
        uint _depositFee
    ) external;

    function setWithdrawFee(
        address token,
        uint _withdrawFee
    ) external;

    function rewards() external view returns (EverscaleAddress memory);
    function configuration() external view returns (EverscaleAddress memory);
    function withdrawalIds(bytes32) external view returns (bool);
    function bridge() external view returns(address);

    function governance() external view returns (address);
    function guardian() external view returns (address);
    function management() external view returns (address);

    function emergencyShutdown() external view returns (bool);

    function setConfiguration(EverscaleAddress memory _configuration) external;
    function setGovernance(address _governance) external;
    function acceptGovernance() external;
    function setGuardian(address _guardian) external;
    function setManagement(address _management) external;
    function setRewards(EverscaleAddress memory _rewards) external;
    function setEmergencyShutdown(bool active) external;

    function decodeWithdrawalEventData(
        bytes memory eventData
    ) external view returns(WithdrawalParams memory);

    function whitelist(address token) external view returns (bool);
    function withdrawFee(address token) external view returns (uint);
    function depositFee(address token) external view returns (uint);

    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint amount
    ) external;

    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures
    ) external;

    function migrateTokenToVault(
        address token,
        address vault
    ) external;

    event WhitelistTokenEnabled(address token);
    event WhitelistTokenDisabled(address token);

    event UpdateBridge(address bridge);
    event UpdateConfiguration(int128 wid, uint256 addr);
    event UpdateRewards(int128 wid, uint256 addr);

    event UpdateDepositFee(address token, uint256 fee);
    event UpdateWithdrawFee(address token, uint256 fee);

    event UpdateGovernance(address governance);
    event UpdateManagement(address management);
    event NewPendingGovernance(address governance);
    event UpdateGuardian(address guardian);

    event EmergencyShutdown(bool active);

    event TokenMigrated(address vault, address token);

    event Deposit(
        uint160 token,
        string symbol,
        string name,
        uint8 decimals,
        uint256 amount,
        int128 wid,
        uint256 addr
    );
}