// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "../IEverscale.sol";


interface IMultiVaultFacetSettings {
    function initialize(
        address _bridge,
        address _governance
    ) external;

    function rewards() external view returns (IEverscale.EverscaleAddress memory);

    function configurationAlien() external view returns (IEverscale.EverscaleAddress memory);
    function configurationNative() external view returns (IEverscale.EverscaleAddress memory);

    function bridge() external view returns(address);

    function governance() external view returns (address);
    function guardian() external view returns (address);
    function management() external view returns (address);
    function withdrawGuardian() external view returns (address);

    function emergencyShutdown() external view returns (bool);
    function setEmergencyShutdown(bool active) external;

    function setGuardian(address) external;
    function setManagement(address) external;
    function acceptGovernance() external;
    function setGovernance(address) external;

    function disableWithdrawalLimits(
        address token
    ) external;

    function enableWithdrawalLimits(
        address token
    ) external;

    function setUndeclaredWithdrawalLimits(
        address token,
        uint undeclared
    ) external;
    function setDailyWithdrawalLimits(
        address token,
        uint daily
    ) external;

    function setConfigurationNative(
        IEverscale.EverscaleAddress memory _configuration
    ) external;
    function setConfigurationAlien(
        IEverscale.EverscaleAddress memory _configuration
    ) external;

    function setRewards(
        IEverscale.EverscaleAddress memory _rewards
    ) external;
}
