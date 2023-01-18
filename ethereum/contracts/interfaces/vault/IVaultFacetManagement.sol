// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../IEverscale.sol";


interface IVaultFacetManagement {
    function initialize(
        address _token,
        address _bridge,
        address _governance,
        uint _targetDecimals,
        IEverscale.EverscaleAddress memory _rewards
    ) external;


    function bridge() external view returns (address);
    function configuration() external view returns (IEverscale.EverscaleAddress memory);
    function rewards() external view returns (IEverscale.EverscaleAddress memory);

    function governance() external view returns (address);
    function guardian() external view returns (address);
    function management() external view returns (address);
    function withdrawGuardian() external view returns (address);

    function token() external view returns (address);
    function targetDecimals() external view returns (uint256);
    function tokenDecimals() external view returns (uint256);

    function emergencyShutdown() external view returns (bool);
    function totalAssets() external view returns (uint256);

    function setConfiguration(IEverscale.EverscaleAddress memory _configuration) external;
    function setGovernance(address _governance) external;
    function acceptGovernance() external;
    function setGuardian(address _guardian) external;
    function setManagement(address _management) external;
    function setWithdrawGuardian(address _withdrawGuardian) external;
    function setRewards(IEverscale.EverscaleAddress memory _rewards) external;
    function setEmergencyShutdown(bool active) external;

    function managementFee() external view returns (uint256);
    function setManagementFee(uint256 fee) external;

    function performanceFee() external view returns (uint256);
    function setPerformanceFee(uint256 fee) external;

    function sweep(address _token) external;
    function skimFees(bool skim_to_everscale) external;
    function fees() external view returns (uint256);
}
