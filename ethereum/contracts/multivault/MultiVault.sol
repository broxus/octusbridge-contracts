// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./../interfaces/multivault/IMultiVault.sol";
import "./../interfaces/IERC20Metadata.sol";
import "./../interfaces/IBridge.sol";

import "./../utils/ChainId.sol";


uint constant MAX_BPS = 10_000;


string constant API_VERSION = '0.1.0';


contract MultiVault is IMultiVault, ReentrancyGuard, Initializable, ChainId {
    using SafeERC20 for IERC20;

    mapping (address => TokenMeta) tokenMeta;

    mapping (address => bool) public override whitelist;
    mapping (address => uint) public override depositFee;
    mapping (address => uint) public override withdrawFee;

    address public override bridge;
    mapping(bytes32 => bool) public override withdrawalIds;
    EverscaleAddress public rewards_;
    EverscaleAddress public configuration_;

    address public override governance;
    address pendingGovernance;
    address public override guardian;
    address public override management;


    function rewards()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return rewards_;
    }

    function configuration()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return configuration_;
    }

    bool public override emergencyShutdown;

    modifier onlyTokenWhitelisted(address token) {
        require(whitelist[token]);

        _;
    }

    modifier onlyEmergencyDisabled() {
        require(!emergencyShutdown, "Vault: emergency mode enabled");

        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance);

        _;
    }

    modifier onlyPendingGovernance() {
        require(msg.sender == pendingGovernance);

        _;
    }

    modifier onlyGovernanceOrManagement() {
        require(msg.sender == governance || msg.sender == management);

        _;
    }

    modifier onlyGovernanceOrGuardian() {
        require(msg.sender == governance || msg.sender == guardian);

        _;
    }

    modifier withdrawalNotSeenBefore(bytes memory payload) {
        bytes32 withdrawalId = keccak256(payload);

        require(!withdrawalIds[withdrawalId], "Vault: withdraw payload already seen");

        _;

        withdrawalIds[withdrawalId] = true;
    }

    /**
        @notice Vault API version. Used to track the deployed version of this contract.
        @return api_version Current API version
    */
    function apiVersion()
        external
        override
        pure
        returns (string memory api_version)
    {
        return API_VERSION;
    }

    function initialize(
        address _bridge,
        address _governance,
        EverscaleAddress memory _rewards
    ) external override initializer {
        bridge = _bridge;
        emit UpdateBridge(bridge);

        governance = _governance;
        emit UpdateGovernance(governance);

        rewards_ = _rewards;
        emit UpdateRewards(rewards_.wid, rewards_.addr);
    }

    function enableToken(
        address token,
        uint _depositFee,
        uint _withdrawFee
    ) external override onlyGovernanceOrManagement {
        require(!whitelist[token]);

        whitelist[token] = true;

        emit WhitelistTokenEnabled(token);

        setDepositFee(token, _depositFee);
        setWithdrawFee(token, _withdrawFee);

        tokenMeta[token] = TokenMeta({
            name: IERC20Metadata(token).name(),
            symbol: IERC20Metadata(token).symbol(),
            decimals: IERC20Metadata(token).decimals()
        });
    }

    function disableToken(
        address token
    ) public override onlyGovernanceOrManagement onlyTokenWhitelisted(token) {
        whitelist[token] = false;

        emit WhitelistTokenDisabled(token);
    }

    /// @notice Set address to receive rewards_ (fees, gains, etc)
    /// This may be called only by `governance`
    /// @param _rewards Rewards receiver in Everscale network
    function setRewards(
        EverscaleAddress memory _rewards
    ) external override onlyGovernance {
        rewards_ = _rewards;

        emit UpdateRewards(rewards_.wid, rewards_.addr);
    }

    /**
        @notice Set deposit fee for specific token. Must be less than `MAX_BPS / 2`.
        This may be called only by `owner` or `management`.
        @param token Token address, must be enabled
        @param _depositFee Deposit fee, must be less than `MAX_BPS / 2`.
    */
    function setDepositFee(
        address token,
        uint _depositFee
    ) public override onlyGovernanceOrManagement onlyTokenWhitelisted(token) {
        require(_depositFee <= MAX_BPS / 2);

        depositFee[token] = _depositFee;

        emit UpdateDepositFee(token, _depositFee);
    }

    /**
        @notice Set withdraw fee for specific token. Must be less than `MAX_BPS / 2`.
        This may be called only by `governance` or `management`
        @param token Token address, must be enabled
        @param _withdrawFee Withdraw fee, must be less than `MAX_BPS / 2`.
    */
    function setWithdrawFee(
        address token,
        uint _withdrawFee
    ) public override onlyGovernanceOrManagement onlyTokenWhitelisted(token) {
        require(_withdrawFee <= MAX_BPS / 2);

        withdrawFee[token] = _withdrawFee;

        emit UpdateWithdrawFee(token, _withdrawFee);
    }

    /// @notice Set configuration_ address.
    /// @param _configuration The address to use for configuration_.
    function setConfiguration(
        EverscaleAddress memory _configuration
    ) external override onlyGovernance {
        configuration_ = _configuration;

        emit UpdateConfiguration(configuration_.wid, configuration_.addr);
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
        pendingGovernance = _governance;

        emit NewPendingGovernance(pendingGovernance);
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
        governance = pendingGovernance;

        emit UpdateGovernance(governance);
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
        management = _management;

        emit UpdateManagement(management);
    }

    /// @notice Changes the address of `guardian`.
    /// This may only be called by `governance` or `guardian`.
    /// @param _guardian The new guardian address to use.
    function setGuardian(
        address _guardian
    ) external override onlyGovernanceOrGuardian {
        guardian = _guardian;

        emit UpdateGuardian(guardian);
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
        if (active) {
            require(msg.sender == guardian || msg.sender == governance);
        } else {
            require(msg.sender == governance);
        }

        emergencyShutdown = active;

        emit EmergencyShutdown(active);
    }

    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint amount
    )
        external
        override
        nonReentrant
        onlyTokenWhitelisted(token)
        onlyEmergencyDisabled
    {
        uint fee = _calculateMovementFee(amount, depositFee[token]);

        if (fee > 0) _transferToEverscale(token, rewards_, fee);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        _transferToEverscale(token, recipient, amount - fee);
    }

    function saveWithdraw(
        bytes memory payload,
        bytes[] memory signatures
    )
        external
        override
        nonReentrant
        withdrawalNotSeenBefore(payload)
        onlyEmergencyDisabled
    {
        require(
            IBridge(bridge).verifySignedEverscaleEvent(payload, signatures) == 0,
            "Vault: signatures verification failed"
        );

        // Decode Everscale event
        (EverscaleEvent memory _event) = abi.decode(payload, (EverscaleEvent));

        require(
            _event.configurationWid == configuration_.wid &&
            _event.configurationAddress == configuration_.addr
        );

        bytes32 payloadId = keccak256(payload);

        // Decode event data
        WithdrawalParams memory withdrawal = decodeWithdrawalEventData(_event.eventData);

        uint256 fee = _calculateMovementFee(withdrawal.amount, withdrawFee[withdrawal.token]);

        if (fee > 0) _transferToEverscale(withdrawal.token, rewards_, fee);

        require(withdrawal.chainId == getChainID());

        IERC20(withdrawal.token).safeTransfer(withdrawal.recipient, withdrawal.amount - fee);
    }

    function decodeWithdrawalEventData(
        bytes memory eventData
    ) public view override returns (WithdrawalParams memory) {
        (
            uint160 token,
            int8 sender_wid,
            uint256 sender_addr,
            uint128 amount,
            uint160 recipient,
            uint32 chainId
        ) = abi.decode(
            eventData,
            (uint160, int8, uint256, uint128, uint160, uint32)
        );

        return WithdrawalParams({
            sender: EverscaleAddress(sender_wid, sender_addr),
            amount: amount,
            recipient: address(recipient),
            token: address(token),
            chainId: chainId
        });
    }

    function migrateTokenToVault(
        address token,
        address vault
    )
        external
        override
        onlyGovernance
        onlyTokenWhitelisted(token)
    {
        disableToken(token);

        IERC20(token).safeTransfer(vault, IERC20(token).balanceOf(address(this)));

        emit TokenMigrated(vault, token);
    }

    function _calculateMovementFee(
        uint256 amount,
        uint256 fee
    ) internal pure returns (uint256) {
        if (fee == 0) return 0;

        return amount * fee / MAX_BPS;
    }

    function _transferToEverscale(
        address token,
        EverscaleAddress memory recipient,
        uint _amount
    ) internal {
        TokenMeta memory meta = tokenMeta[token];

        emit Deposit(
            uint160(token),
            meta.symbol,
            meta.name,
            meta.decimals,
            _amount,
            recipient.wid,
            recipient.addr
        );
    }
}