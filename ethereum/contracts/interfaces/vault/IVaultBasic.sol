// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./IVaultEvents.sol";


interface IVaultBasic is IVaultEvents {
    function bridge() external view returns (address);
    function configuration() external view returns (EverscaleAddress memory);
    function withdrawalIds(bytes32) external view returns (bool);
    function rewards() external view returns (EverscaleAddress memory);

    function governance() external view returns (address);
    function guardian() external view returns (address);

    function token() external view returns (address);
    function targetDecimals() external view returns (uint256);
    function tokenDecimals() external view returns (uint256);

    function depositFee() external view returns (uint256);
    function withdrawFee() external view returns (uint256);
    function totalAssets() external view returns (uint256);

    function emergencyShutdown() external view returns (bool);

    function initialize(
        address _token,
        address _bridge,
        address _governance,
        uint _targetDecimals,
        EverscaleAddress memory _rewards
    ) external;

    function apiVersion() external view returns (string memory api_version);

    function setDepositFee(uint _depositFee) external;
    function setWithdrawFee(uint _withdrawFee) external;

    function setConfiguration(EverscaleAddress memory _configuration) external;
    function setGovernance(address _governance) external;
    function acceptGovernance() external;
    function setGuardian(address _guardian) external;
    function setRewards(EverscaleAddress memory _rewards) external;
    function setEmergencyShutdown(bool active) external;

    function deposit(
        EverscaleAddress memory recipient,
        uint256 amount
    ) external;

    function saveWithdrawal(
        bytes memory payload,
        bytes[] memory signatures
    ) external returns (bool instantWithdrawal, PendingWithdrawalId memory pendingWithdrawalId);

    function sweep(address _token) external;
}