// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/vault/IVaultFacetManagement.sol";
import "../../interfaces/vault/IVaultFacetManagementEvents.sol";
import "../../interfaces/IEverscale.sol";

import "../helpers/VaultHelperInitializable.sol";
import "../helpers/VaultHelperRoles.sol";
import "../helpers/VaultHelperEverscale.sol";
import "../helpers/VaultHelperTokenBalance.sol";

import "../storage/VaultStorageVault.sol";
import "../../interfaces/vault/IVaultFacetWithdrawEvents.sol";


contract VaultFacetManagement is
    VaultHelperInitializable,
    VaultHelperRoles,
    VaultHelperEverscale,
    VaultHelperTokenBalance,
    IVaultFacetManagement,
    IVaultFacetManagementEvents,
    IVaultFacetWithdrawEvents
{
    using SafeERC20 for IERC20;

    function initialize(
        address _token,
        address _bridge,
        address _governance,
        uint _targetDecimals,
        IEverscale.EverscaleAddress memory _rewards
    ) external override initializer {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.bridge = _bridge;
        emit UpdateBridge(s.bridge);

        s.governance = _governance;
        emit UpdateGovernance(s.governance);

        s.rewards_ = _rewards;
        emit UpdateRewards(s.rewards_.wid, s.rewards_.addr);

        s.performanceFee = 0;
        emit UpdatePerformanceFee(0);

        s.managementFee = 0;
        emit UpdateManagementFee(0);

        s.withdrawFee = 0;
        emit UpdateWithdrawFee(0);

        s.depositFee = 0;
        emit UpdateDepositFee(0);

        s.token = _token;
        s.tokenDecimals = IERC20Metadata(s.token).decimals();
        s.targetDecimals = _targetDecimals;
    }

    /// @notice Returns the total quantity of all assets under control of this
    /// Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @return The total assets under control of this Vault.
    function totalAssets() external view override returns (uint256) {
        return _totalAssets();
    }


    /// @notice Changes the value of `performanceFee`.
    /// Should set this value below the maximum strategist performance fee.
    /// This may only be called by `governance`.
    /// @param fee The new performance fee to use.
    function setPerformanceFee(
        uint256 fee
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(fee <= VaultStorageVault.MAX_BPS / 2);

        s.performanceFee = fee;

        emit UpdatePerformanceFee(s.performanceFee);
    }

    /// @notice Changes the value of `managementFee`.
    /// This may only be called by `governance`.
    /// @param fee The new management fee to use.
    function setManagementFee(
        uint256 fee
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(fee <= VaultStorageVault.MAX_BPS);

        s.managementFee = fee;

        emit UpdateManagementFee(s.managementFee);
    }

    /// @notice Set configuration_ address.
    /// @param _configuration The address to use for configuration_.
    function setConfiguration(
        IEverscale.EverscaleAddress memory _configuration
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.configuration_ = _configuration;

        emit UpdateConfiguration(s.configuration_.wid, s.configuration_.addr);
    }

    /// @notice Nominate new address to use as a governance.
    /// The change does not go into effect immediately. This function sets a
    /// pending change, and the governance address is not updated until
    /// the proposed governance address has accepted the responsibility.
    /// This may only be called by the `governance`.
    /// @param _governance The address requested to take over Vault governance.
    function setGovernance(
        address _governance
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.pendingGovernance = _governance;

        emit NewPendingGovernance(s.pendingGovernance);
    }

    /// @notice Once a new governance address has been proposed using `setGovernance`,
    /// this function may be called by the proposed address to accept the
    /// responsibility of taking over governance for this contract.
    /// This may only be called by the `pendingGovernance`.
    function acceptGovernance()
        external
        override
        onlyPendingGovernance
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.governance = s.pendingGovernance;

        emit UpdateGovernance(s.governance);
    }

    /// @notice Changes the management address.
    /// This may only be called by `governance`
    /// @param _management The address to use for management.
    function setManagement(
        address _management
    )
        external
        override
        onlyGovernance
    {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.management = _management;

        emit UpdateManagement(s.management);
    }

    /// @notice Changes the address of `guardian`.
    /// This may only be called by `governance` or `guardian`.
    /// @param _guardian The new guardian address to use.
    function setGuardian(
        address _guardian
    ) external override onlyGovernanceOrGuardian {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.guardian = _guardian;

        emit UpdateGuardian(s.guardian);
    }

    /// @notice Changes the address of `withdrawGuardian`.
    /// This may only be called by `governance` or `withdrawGuardian`.
    /// @param _withdrawGuardian The new withdraw guardian address to use.
    function setWithdrawGuardian(
        address _withdrawGuardian
    ) external override onlyGovernanceOrWithdrawGuardian {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.withdrawGuardian = _withdrawGuardian;

        emit UpdateWithdrawGuardian(s.withdrawGuardian);
    }

    /// @notice Set address to receive rewards_ (fees, gains, etc)
    /// This may be called only by `governance`
    /// @param _rewards Rewards receiver in Everscale network
    function setRewards(
        IEverscale.EverscaleAddress memory _rewards
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        s.rewards_ = _rewards;

        emit UpdateRewards(s.rewards_.wid, s.rewards_.addr);
    }

    /// @notice Activates or deactivates Vault emergency mode, where all Strategies go into full withdrawal.
    ///     During emergency shutdown:
    ///     - Deposits are disabled
    ///     - Withdrawals are disabled (all types of withdrawals)
    ///     - Each Strategy must pay back their debt as quickly as reasonable to minimally affect their position
    ///     - Only `governance` may undo Emergency Shutdown
    /// This may only be called by `governance` or `guardian`.
    /// @param active If `true`, the Vault goes into Emergency Shutdown. If `false`, the Vault goes back into
    ///     Normal Operation.
    function setEmergencyShutdown(
        bool active
    ) external override {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        if (active) {
            require(msg.sender == s.guardian || msg.sender == s.governance);
        } else {
            require(msg.sender == s.governance);
        }

        s.emergencyShutdown = active;

        emit EmergencyShutdown(active);
    }

    /**
        @notice Removes tokens from this Vault that are not the type of token managed
            by this Vault. This may be used in case of accidentally sending the
            wrong kind of token to this Vault.

            Tokens will be sent to `governance`.

            This will fail if an attempt is made to sweep the tokens that this
            Vault manages.

            This may only be called by `governance`.
        @param _token The token to transfer out of this vault.
    */
    function sweep(
        address _token
    ) external override onlyGovernance {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(s.token != _token);

        uint256 amount = IERC20(_token).balanceOf(address(this));

        IERC20(_token).safeTransfer(s.governance, amount);
    }

    /// @notice Skim Vault fees to the `rewards_` address
    /// This may only be called by `governance` or `management`
    /// @param skim_to_everscale Skim fees to Everscale or not
    function skimFees(
        bool skim_to_everscale
    ) external override onlyGovernanceOrManagement {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        require(s.fees > 0);

        if (skim_to_everscale) {
            _transferToEverscale(s.rewards_, s.fees);
        } else {
            IERC20(s.token).safeTransfer(s.governance, s.fees);
        }

        s.fees = 0;
    }

    function tokenDecimals() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.tokenDecimals;
    }

    function targetDecimals() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.targetDecimals;
    }

    function token() external view override returns(address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.token;
    }

    function rewards() external view override returns(IEverscale.EverscaleAddress memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.rewards_;
    }

    function guardian() external view override returns(address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.guardian;
    }

    function governance() external view override returns(address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.governance;
    }

    function management() external view override returns(address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.management;
    }

    function fees() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.fees;
    }

    function emergencyShutdown() external view override returns(bool) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.emergencyShutdown;
    }

    function configuration() external view override returns(IEverscale.EverscaleAddress memory) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.configuration_;
    }

    function bridge() external view override returns(address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.bridge;
    }

    function managementFee() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.managementFee;
    }

    function performanceFee() external view override returns(uint256) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.performanceFee;
    }

    function withdrawGuardian() external view override returns (address) {
        VaultStorageVault.Storage storage s = VaultStorageVault._storage();

        return s.withdrawGuardian;
    }
}
