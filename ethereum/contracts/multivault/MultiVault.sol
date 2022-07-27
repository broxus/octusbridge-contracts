// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.0;


import "./interfaces/IERC20.sol";
import "./interfaces/IMultiVault.sol";
import "./interfaces/IMultiVaultToken.sol";
import "./interfaces/IBridge.sol";

import "./libraries/SafeERC20.sol";

import "./utils/Initializable.sol";
import "./utils/ReentrancyGuard.sol";
import "./utils/ChainId.sol";

import "./MultiVaultToken.sol";


uint constant MAX_BPS = 10_000;
uint constant FEE_LIMIT = MAX_BPS / 2;

uint8 constant DECIMALS_LIMIT = 18;
uint256 constant SYMBOL_LENGTH_LIMIT = 32;
uint256 constant NAME_LENGTH_LIMIT = 32;

string constant DEFAULT_NAME_PREFIX = 'Octus ';
string constant DEFAULT_SYMBOL_PREFIX = 'oct';
uint256 constant WITHDRAW_PERIOD_DURATION_IN_SECONDS = 60 * 60 * 24; // 24 hours

//string constant API_VERSION = '0.1.4';


/// @notice Vault, based on Octus Bridge. Allows to transfer arbitrary tokens from Everscale
/// to EVM and backwards. Everscale tokens are called "natives" (eg QUBE). EVM tokens are called
/// "aliens" (eg AAVE).
/// Inspired by Yearn Vault V2.
contract MultiVault is IMultiVault, ReentrancyGuard, Initializable, ChainId {
    using SafeERC20 for IERC20;

//    function getInitHash() public pure returns(bytes32) {
//        bytes memory bytecode = type(MultiVaultToken).creationCode;
//        return keccak256(abi.encodePacked(bytecode));
//    }

    mapping (address => Token) tokens_;
    mapping (address => EverscaleAddress) natives_;

    uint public override defaultNativeDepositFee;
    uint public override defaultNativeWithdrawFee;
    uint public override defaultAlienDepositFee;
    uint public override defaultAlienWithdrawFee;

    bool public override emergencyShutdown;

    address public override bridge;
    mapping(bytes32 => bool) public override withdrawalIds;
    EverscaleAddress rewards_;
    EverscaleAddress configurationNative_;
    EverscaleAddress configurationAlien_;

    address public override governance;
    address pendingGovernance;
    address public override guardian;
    address public override management;

    mapping (address => TokenPrefix) prefixes_;
    mapping (address => uint) public override fees;

    // STORAGE UPDATE 1
    // Pending withdrawals
    // - Counter pending withdrawals per user
    mapping(address => uint) public override pendingWithdrawalsPerUser;
    // - Pending withdrawal details
    mapping(address => mapping(uint256 => PendingWithdrawalParams)) pendingWithdrawals_;

    function pendingWithdrawals(
        address user,
        uint256 id
    ) external view override returns (PendingWithdrawalParams memory) {
        return pendingWithdrawals_[user][id];
    }

    // - Total amount of pending withdrawals per token
    mapping(address => uint) public override pendingWithdrawalsTotal;

    // STORAGE UPDATE 2
    // Withdrawal limits per token
    mapping(address => WithdrawalLimits) withdrawalLimits_;

    function withdrawalLimits(
        address token
    ) external view override returns(WithdrawalLimits memory) {
        return withdrawalLimits_[token];
    }

    // - Withdrawal periods. Each period is `WITHDRAW_PERIOD_DURATION_IN_SECONDS` seconds long.
    // If some period has reached the `withdrawalLimitPerPeriod` - all the future
    // withdrawals in this period require manual approve, see note on `setPendingWithdrawalsApprove`
    mapping(address => mapping(uint256 => WithdrawalPeriodParams)) withdrawalPeriods_;

    function withdrawalPeriods(
        address token,
        uint256 withdrawalPeriodId
    ) external view override returns (WithdrawalPeriodParams memory) {
        return withdrawalPeriods_[token][withdrawalPeriodId];
    }

    address public override withdrawGuardian;

    // === STORAGE END

    modifier tokenNotBlacklisted(address token) {
        require(!tokens_[token].blacklisted);

        _;
    }

    modifier initializeToken(address token) {
        if (tokens_[token].activation == 0) {
            // Non-activated tokens are always aliens, native tokens are activate on the first `saveWithdrawNative`

            require(
                IERC20Metadata(token).decimals() <= DECIMALS_LIMIT &&
                bytes(IERC20Metadata(token).symbol()).length <= SYMBOL_LENGTH_LIMIT &&
                bytes(IERC20Metadata(token).name()).length <= NAME_LENGTH_LIMIT
            );

            _activateToken(token, false);
        }

        _;
    }

    modifier onlyEmergencyDisabled() {
        require(!emergencyShutdown);

        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance);

        _;
    }

    modifier onlyGovernanceOrManagement() {
        require(msg.sender == governance || msg.sender == management);

        _;
    }

    modifier onlyGovernanceOrWithdrawGuardian() {
        require(msg.sender == governance || msg.sender == withdrawGuardian);

        _;
    }

    modifier pendingWithdrawalOpened(
        PendingWithdrawalId memory pendingWithdrawalId
    ) {
        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(pendingWithdrawal.amount > 0);

        _;
    }

    modifier withdrawalNotSeenBefore(bytes memory payload) {
        bytes32 withdrawalId = keccak256(payload);

        require(!withdrawalIds[withdrawalId]);

        _;

        withdrawalIds[withdrawalId] = true;
    }

    modifier respectFeeLimit(uint fee) {
        require(fee <= FEE_LIMIT);

        _;
    }

    /// @notice Get token prefix
    /// @dev Used to set up in advance prefix for the ERC20 native token
    /// @param _token Token address
    /// @return Name and symbol prefix
    function prefixes(
        address _token
    ) external view override returns (TokenPrefix memory) {
        return prefixes_[_token];
    }

    /// @notice Get token information
    /// @param _token Token address
    function tokens(
        address _token
    ) external view override returns (Token memory) {
        return tokens_[_token];
    }

    /// @notice Get native Everscale token address for EVM token
    /// @param _token Token address
    function natives(
        address _token
    ) external view override returns (EverscaleAddress memory) {
        return natives_[_token];
    }

    /// @notice Rewards address
    /// @return Everscale address, used for collecting rewards.
    function rewards()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return rewards_;
    }

    /// @notice Native configuration address
    /// @return Everscale address, used for verifying native withdrawals
    function configurationNative()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return configurationNative_;
    }

    /// @notice Alien configuration address
    /// @return Everscale address, used for verifying alien withdrawals
    function configurationAlien()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return configurationAlien_;
    }

//    /// @notice Vault API version. Used to track the deployed version of this contract.
//    //  @return api_version Current API version
//    function apiVersion()
//        external
//        override
//        pure
//        returns (string memory api_version)
//    {
//        return API_VERSION;
//    }

    /// @notice MultiVault initializer
    /// @param _bridge Bridge address
    /// @param _governance Governance address
    function initialize(
        address _bridge,
        address _governance
    ) external override initializer {
        bridge = _bridge;
        governance = _governance;
    }

    /// @notice Set prefix for native token
    /// @param token Expected native token address, see note on `getNative`
    /// @param name_prefix Name prefix, leave empty for no-prefix
    /// @param symbol_prefix Symbol prefix, leave empty for no-prefix
    function setPrefix(
        address token,
        string memory name_prefix,
        string memory symbol_prefix
    ) external override onlyGovernanceOrManagement {
        TokenPrefix memory prefix = prefixes_[token];

        if (prefix.activation == 0) {
            prefix.activation = block.number;
        }

        prefix.name = name_prefix;
        prefix.symbol = symbol_prefix;

        prefixes_[token] = prefix;
    }

    function setTokenBlacklist(
        address token,
        bool blacklisted
    ) external override onlyGovernance {
        tokens_[token].blacklisted = blacklisted;
    }

//    /// @notice Set address to receive fees.
//    /// This may be called only by `governance`
//    /// @param _rewards Rewards receiver in Everscale network
//    function setRewards(
//        EverscaleAddress memory _rewards
//    ) external override onlyGovernance {
//        rewards_ = _rewards;
//    }

    function configure(
        uint _defaultNativeDepositFee,
        uint _defaultNativeWithdrawFee,
        uint _defaultAlienDepositFee,
        uint _defaultAlienWithdrawFee,

        EverscaleAddress memory _rewards,
        EverscaleAddress memory alien,
        EverscaleAddress memory native
    ) external override onlyGovernanceOrManagement {
        defaultNativeDepositFee = _defaultNativeDepositFee;
        defaultNativeWithdrawFee = _defaultNativeWithdrawFee;
        defaultAlienDepositFee = _defaultAlienDepositFee;
        defaultAlienWithdrawFee = _defaultAlienWithdrawFee;

        rewards_ = _rewards;
        configurationAlien_ = alien;
        configurationNative_ = native;
    }

    /// @notice Set deposit fee for specific token.
    /// This may be called only by `owner` or `management`.
    /// @param token Token address
    /// @param _depositFee Deposit fee, must be less than FEE_LIMIT.
    function setTokenFees(
        address token,
        uint _depositFee,
        uint _withdrawFee
    )
        external
        override
        onlyGovernanceOrManagement
        respectFeeLimit(_depositFee)
    {
        tokens_[token].depositFee = _depositFee;
        tokens_[token].withdrawFee = _withdrawFee;
    }

    /// @notice Enable or upgrade withdrawal limits for specific token
    /// Can be called only by governance
    /// @param token Token address
    /// @param undeclared Undeclared withdrawal amount limit
    /// @param daily Daily withdrawal amount limit
    function enableWithdrawalLimits(
        address token,
        uint undeclared,
        uint daily
    ) external override onlyGovernance {
        require(daily >= undeclared);

        withdrawalLimits_[token] = WithdrawalLimits({
            enabled: true,
            daily: daily,
            undeclared: undeclared
        });
    }

    /// @notice Disable withdrawal limits for specific token
    /// Can be called only by governance
    /// @param token Token address
    function disableWithdrawalLimits(
        address token
    ) external override onlyGovernance {
        withdrawalLimits_[token].enabled = false;
    }

//    /// @notice Set alien configuration address.
//    /// @param alien Everscale address of the alien configuration
//    /// @param native Everscale address of the native configuration
//    function setConfigurations(
//        EverscaleAddress memory alien,
//        EverscaleAddress memory native
//    ) external override onlyGovernance {
//        configurationAlien_ = alien;
//        configurationNative_ = native;
//    }

    /// @notice Nominate new address to use as a governance.
    /// The change does not go into effect immediately. This function sets a
    /// pending change, and the governance address is not updated until
    /// the proposed governance address has accepted the responsibility.
    /// This may only be called by the `governance`.
    /// @param _governance The address requested to take over Vault governance.
    function setGovernance(
        address _governance
    ) external override onlyGovernance {
        governance = _governance;
    }

    function setRoles(
        address _management,
        address _guardian,
        address _withdrawGuardian
    ) external override onlyGovernance {
        management = _management;
        guardian = _guardian;
        withdrawGuardian = _withdrawGuardian;
    }

    /// @notice Activates or deactivates MultiVault emergency shutdown.
    ///     During emergency shutdown:
    ///     - Deposits are disabled
    ///     - Withdrawals are disabled
    /// This may only be called by `governance` or `guardian`.
    /// @param active If `true`, the MultiVault goes into Emergency Shutdown. If `false`, the MultiVault goes back into
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
    }

    /// @notice Changes pending withdrawal bounty for specific pending withdrawal
    /// @param id Pending withdrawal ID.
    /// @param bounty The new value for pending withdrawal bounty.
    function setPendingWithdrawalBounty(
        uint256 id,
        uint256 bounty
    )
        public
        override
    {
        PendingWithdrawalParams memory pendingWithdrawal = pendingWithdrawals_[msg.sender][id];

        require(bounty <= pendingWithdrawal.amount);

        pendingWithdrawals_[msg.sender][id].bounty = bounty;

        emit PendingWithdrawalUpdateBounty(
            msg.sender,
            id,
            bounty
        );
    }

    function forceWithdraw(
        PendingWithdrawalId[] memory pendingWithdrawalIds
    ) external override {
        for (uint i = 0; i < pendingWithdrawalIds.length; i++) {
            PendingWithdrawalId memory pendingWithdrawalId = pendingWithdrawalIds[i];

            PendingWithdrawalParams memory pendingWithdrawal = pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id];

            pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].amount = 0;

            IERC20(pendingWithdrawal.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount
            );

            emit PendingWithdrawalForce(
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id
            );
        }
    }

    /// @notice Cancel pending withdrawal partially or completely.
    /// This may only be called by pending withdrawal recipient.
    /// @param id Pending withdrawal ID
    /// @param amount Amount to cancel, should be less or equal than pending withdrawal amount
    /// @param recipient Tokens recipient, in Everscale network
    /// @param bounty New value for bounty
    function cancelPendingWithdrawal(
        uint256 id,
        uint256 amount,
        EverscaleAddress memory recipient,
        uint bounty
    )
        external
        override
        onlyEmergencyDisabled
    {
        PendingWithdrawalParams memory pendingWithdrawal = pendingWithdrawals_[msg.sender][id];

        require(amount > 0 && amount <= pendingWithdrawal.amount);

        pendingWithdrawals_[msg.sender][id].amount -= amount;

        _transferToEverscaleAlien(pendingWithdrawal.token, recipient, amount);

        emit PendingWithdrawalCancel(msg.sender, id, amount);

        setPendingWithdrawalBounty(id, bounty);
    }

    /// @notice Transfer tokens to the Everscale. Works both for native and alien tokens.
    /// Approve is required only for alien tokens deposit.
    /// @param recipient Everscale recipient.
    /// @param token EVM token address, should not be blacklisted.
    /// @param amount Amount of tokens to transfer.
    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint amount
    )
        external
        override
        nonReentrant
        tokenNotBlacklisted(token)
        initializeToken(token)
        onlyEmergencyDisabled
    {
        uint fee = calculateMovementFee(amount, token, Fee.Deposit);

        bool isNative = tokens_[token].isNative;

        if (isNative) {
            IMultiVaultToken(token).burn(
                msg.sender,
                amount
            );

            _transferToEverscaleNative(token, recipient, amount - fee);
        } else {
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );

            _transferToEverscaleAlien(token, recipient, amount - fee);
        }

        _increaseTokenFee(token, fee);

        emit Deposit(
            isNative ? TokenType.Native : TokenType.Alien,
            msg.sender,
            token,
            recipient.wid,
            recipient.addr,
            amount,
            fee
        );
    }

    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint256 amount,
        uint256 expectedMinBounty,
        PendingWithdrawalId[] memory pendingWithdrawalIds
    ) external override tokenNotBlacklisted(token) nonReentrant {
        uint amountLeft = amount;
        uint amountPlusBounty = amount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        for (uint i = 0; i < pendingWithdrawalIds.length; i++) {
            PendingWithdrawalId memory pendingWithdrawalId = pendingWithdrawalIds[i];
            PendingWithdrawalParams memory pendingWithdrawal = pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id];

            require(pendingWithdrawal.amount > 0);
            require(pendingWithdrawal.token == token);

            amountLeft -= pendingWithdrawal.amount;
            amountPlusBounty += pendingWithdrawal.bounty;

            pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].amount = 0;

            emit PendingWithdrawalFill(
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id
            );

            IERC20(pendingWithdrawal.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount - pendingWithdrawal.bounty
            );
        }

        require(amountPlusBounty - amount >= expectedMinBounty);

        uint fee = calculateMovementFee(amount, token, Fee.Deposit);

        _transferToEverscaleAlien(
            token,
            recipient,
            amountPlusBounty - fee
        );

        _increaseTokenFee(token, fee);
    }

    /// @notice Save withdrawal for native token
    /// @param payload Withdraw payload
    /// @param signatures Payload signatures
    function saveWithdrawNative(
        bytes memory payload,
        bytes[] memory signatures
    )
        external
        override
        nonReentrant
        withdrawalNotSeenBefore(payload)
        onlyEmergencyDisabled
    {
        EverscaleEvent memory _event = _processWithdrawEvent(
            payload,
            signatures,
            configurationNative_
        );

        bytes32 payloadId = keccak256(payload);

        // Decode event data
        NativeWithdrawalParams memory withdrawal = decodeNativeWithdrawalEventData(_event.eventData);

        // Ensure chain id is correct
        require(withdrawal.chainId == getChainID());

        // Derive token address
        // Depends on the withdrawn token source
        address token = _getNativeWithdrawalToken(withdrawal);

        // Ensure token is not blacklisted
        require(!tokens_[token].blacklisted);

        // Consider movement fee and send it to `rewards_`
        uint256 fee = calculateMovementFee(
            withdrawal.amount,
            token,
            Fee.Withdraw
        );

        _increaseTokenFee(token, fee);

        _withdraw(
            withdrawal.recipient,
            withdrawal.amount,
            fee,
            TokenType.Native,
            payloadId,
            token
        );
    }

    function _withdraw(
        address recipient,
        uint amount,
        uint fee,
        TokenType tokenType,
        bytes32 payloadId,
        address token
    ) internal {
        if (tokenType == TokenType.Native) {
            IMultiVaultToken(token).mint(recipient, amount - fee);
        } else {
            IERC20(token).safeTransfer(recipient, amount - fee);
        }

        emit Withdraw(
            tokenType,
            payloadId,
            token,
            recipient,
            amount,
            fee
        );
    }

    /// @notice Save withdrawal of alien token
    function saveWithdrawAlien(
        bytes memory payload,
        bytes[] memory signatures,
        uint bounty
    )
        public
        override
        nonReentrant
        withdrawalNotSeenBefore(payload)
        onlyEmergencyDisabled
    {
        EverscaleEvent memory _event = _processWithdrawEvent(
            payload,
            signatures,
            configurationAlien_
        );

        bytes32 payloadId = keccak256(payload);

        // Decode event data
        AlienWithdrawalParams memory withdrawal = decodeAlienWithdrawalEventData(_event.eventData);

        // Ensure chain id is correct
        require(withdrawal.chainId == getChainID());

        // Ensure token is not blacklisted
        require(!tokens_[withdrawal.token].blacklisted);

        // Consider movement fee and send it to `rewards_`
        uint256 fee = calculateMovementFee(
            withdrawal.amount,
            withdrawal.token,
            Fee.Withdraw
        );

        _increaseTokenFee(withdrawal.token, fee);

        uint withdrawAmount = withdrawal.amount - fee;

        // Consider withdrawal period limit
        WithdrawalPeriodParams memory withdrawalPeriod = _withdrawalPeriod(
            withdrawal.token,
            _event.eventTimestamp
        );

        _withdrawalPeriodIncreaseTotalByTimestamp(
            withdrawal.token,
            _event.eventTimestamp,
            withdrawal.amount
        );

        bool withdrawalLimitsPassed = _withdrawalPeriodCheckLimitsPassed(
            withdrawal.token,
            withdrawal.amount,
            withdrawalPeriod
        );

        // Token balance sufficient and none of the limits are violated
        if (withdrawal.amount <= _vaultTokenBalance(withdrawal.token) && withdrawalLimitsPassed) {
            _withdraw(
                withdrawal.recipient,
                withdrawal.amount,
                fee,
                TokenType.Alien,
                payloadId,
                withdrawal.token
            );

            return;
        }

        // Create pending withdrawal
        uint pendingWithdrawalId = pendingWithdrawalsPerUser[withdrawal.recipient];

        pendingWithdrawalsPerUser[withdrawal.recipient]++;

        pendingWithdrawalsTotal[withdrawal.token] += withdrawAmount;

        // - Save withdrawal as pending
        pendingWithdrawals_[withdrawal.recipient][pendingWithdrawalId] = PendingWithdrawalParams({
            token: withdrawal.token,
            amount: withdrawAmount,
            bounty: msg.sender == withdrawal.recipient ? bounty : 0,
            timestamp: _event.eventTimestamp,
            approveStatus: ApproveStatus.NotRequired
        });

        emit PendingWithdrawalCreated(
            withdrawal.recipient,
            pendingWithdrawalId,
            withdrawal.token,
            withdrawAmount,
            payloadId
        );

        if (!withdrawalLimitsPassed) {
            _pendingWithdrawalApproveStatusUpdate(
                PendingWithdrawalId(withdrawal.recipient, pendingWithdrawalId),
                ApproveStatus.Required
            );
        }
    }

    /// @notice Save withdrawal of alien token
    function saveWithdrawAlien(
        bytes memory payload,
        bytes[] memory signatures
    )
        external
        override
    {
        saveWithdrawAlien(payload, signatures, 0);
    }

    /// @notice Skim multivault fees for specific token
    /// @dev If `skim_to_everscale` is true, than fees will be sent to Everscale.
    /// Token type will be derived automatically and transferred with correct pipeline to the `rewards`.
    /// Otherwise, tokens will be transferred to the `governance` address.
    ///
    /// Can be called only by governance or management.
    /// @param token Token address, can be both native or alien
    /// @param skim_to_everscale Skim fees to Everscale or not
    function skim(
        address token,
        bool skim_to_everscale
    ) external override nonReentrant onlyGovernanceOrManagement {
        uint fee = fees[token];

        require(fee > 0);

        fees[token] = 0;

        // Find out token type
        bool isNative = tokens_[token].isNative;

        if (skim_to_everscale) {
            if (isNative) {
                _transferToEverscaleNative(token, rewards_, fee);
            } else {
                _transferToEverscaleAlien(token, rewards_, fee);
            }
        } else {
            if (isNative) {
                IMultiVaultToken(token).mint(governance, fee);
            } else {
                IERC20(token).safeTransfer(governance, fee);
            }
        }

        emit SkimFee(token, skim_to_everscale, fee);
    }

    /// @notice Calculates fee for deposit or withdrawal.
    /// @param amount Amount of tokens.
    /// @param _token Token address.
    /// @param fee Fee type (Deposit = 0, Withdraw = 1).
    function calculateMovementFee(
        uint256 amount,
        address _token,
        Fee fee
    ) internal view returns (uint256) {
        Token memory token = tokens_[_token];

        uint tokenFee = fee == Fee.Deposit ? token.depositFee : token.withdrawFee;

        return tokenFee * amount / MAX_BPS;
    }

    function _increaseTokenFee(
        address token,
        uint amount
    ) internal {
        if (amount > 0) fees[token] += amount;
    }

    function _activateToken(
        address token,
        bool isNative
    ) internal {
        uint depositFee = isNative ? defaultNativeDepositFee : defaultAlienDepositFee;
        uint withdrawFee = isNative ? defaultNativeWithdrawFee : defaultAlienWithdrawFee;

        tokens_[token] = Token({
            activation: block.number,
            blacklisted: false,
            isNative: isNative,
            depositFee: depositFee,
            withdrawFee: withdrawFee
        });

        emit TokenActivated(
            token,
            block.number,
            isNative,
            depositFee,
            withdrawFee
        );
    }

    function _transferToEverscaleNative(
        address _token,
        EverscaleAddress memory recipient,
        uint amount
    ) internal {
        EverscaleAddress memory native = natives_[_token];

        emit NativeTransfer(
            native.wid,
            native.addr,
            uint128(amount),
            recipient.wid,
            recipient.addr
        );
    }

    function _transferToEverscaleAlien(
        address _token,
        EverscaleAddress memory recipient,
        uint amount
    ) internal {
        emit AlienTransfer(
            getChainID(),
            uint160(_token),
            IERC20Metadata(_token).name(),
            IERC20Metadata(_token).symbol(),
            IERC20Metadata(_token).decimals(),
            uint128(amount),
            recipient.wid,
            recipient.addr
        );
    }

    function _getNativeWithdrawalToken(
        NativeWithdrawalParams memory withdrawal
    ) internal returns (address token) {
        token = getNativeToken(
            withdrawal.native.wid,
            withdrawal.native.addr
        );

        if (tokens_[token].activation == 0) {
            _deployTokenForNative(withdrawal.native, withdrawal.meta);
            _activateToken(token, true);

            natives_[token] = withdrawal.native;
        }
    }

    function _deployTokenForNative(
        EverscaleAddress memory native,
        TokenMeta memory meta
    ) internal returns (address token) {
        bytes memory bytecode = type(MultiVaultToken).creationCode;

        bytes32 salt = keccak256(abi.encodePacked(native.wid, native.addr));

        assembly {
            token := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // Check custom prefix available
        TokenPrefix memory prefix = prefixes_[token];

        string memory name_prefix = prefix.activation == 0 ? DEFAULT_NAME_PREFIX : prefix.name;
        string memory symbol_prefix = prefix.activation == 0 ? DEFAULT_SYMBOL_PREFIX : prefix.symbol;

        IMultiVaultToken(token).initialize(
            string(abi.encodePacked(name_prefix, meta.name)),
            string(abi.encodePacked(symbol_prefix, meta.symbol)),
            meta.decimals
        );

        emit TokenCreated(
            token,
            native.wid,
            native.addr,
            name_prefix,
            symbol_prefix,
            meta.name,
            meta.symbol,
            meta.decimals
        );
    }

    function _processWithdrawEvent(
        bytes memory payload,
        bytes[] memory signatures,
        EverscaleAddress memory configuration
    ) internal view returns (EverscaleEvent memory) {
        require(
            IBridge(bridge).verifySignedEverscaleEvent(payload, signatures) == 0
        );

        // Decode Everscale event
        (EverscaleEvent memory _event) = abi.decode(payload, (EverscaleEvent));

        require(
            _event.configurationWid == configuration.wid &&
            _event.configurationAddress == configuration.addr
        );

        return _event;
     }

    function _withdrawalPeriod(
        address token,
        uint256 timestamp
    ) internal view returns (WithdrawalPeriodParams memory) {
        return withdrawalPeriods_[token][_withdrawalPeriodDeriveId(timestamp)];
    }

    function _withdrawalPeriodDeriveId(
        uint256 timestamp
    ) internal pure returns (uint256) {
        return timestamp / WITHDRAW_PERIOD_DURATION_IN_SECONDS;
    }

    function _withdrawalPeriodIncreaseTotalByTimestamp(
        address token,
        uint256 timestamp,
        uint256 amount
    ) internal {
        uint withdrawalPeriodId = _withdrawalPeriodDeriveId(timestamp);

        withdrawalPeriods_[token][withdrawalPeriodId].total += amount;
    }

    function _withdrawalPeriodCheckLimitsPassed(
        address token,
        uint amount,
        WithdrawalPeriodParams memory withdrawalPeriod
    ) internal view returns (bool) {
        WithdrawalLimits memory withdrawalLimit = withdrawalLimits_[token];

        if (!withdrawalLimit.enabled) return true;

        return (amount < withdrawalLimit.undeclared) &&
            (amount + withdrawalPeriod.total - withdrawalPeriod.considered < withdrawalLimit.daily);
    }

    function _vaultTokenBalance(
        address token
    ) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function _pendingWithdrawal(
        PendingWithdrawalId memory pendingWithdrawalId
    ) internal view returns (PendingWithdrawalParams memory) {
        return pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id];
    }

    function _pendingWithdrawalApproveStatusUpdate(
        PendingWithdrawalId memory pendingWithdrawalId,
        ApproveStatus approveStatus
    ) internal {
        pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].approveStatus = approveStatus;

        emit PendingWithdrawalUpdateApproveStatus(
            pendingWithdrawalId.recipient,
            pendingWithdrawalId.id,
            approveStatus
        );
    }

    function _pendingWithdrawalAmountReduce(
        address token,
        PendingWithdrawalId memory pendingWithdrawalId,
        uint amount
    ) internal {
        pendingWithdrawals_[pendingWithdrawalId.recipient][pendingWithdrawalId.id].amount -= amount;
        pendingWithdrawalsTotal[token] -= amount;
    }

    function decodeNativeWithdrawalEventData(
        bytes memory eventData
    ) internal pure returns (IMultiVault.NativeWithdrawalParams memory) {
        (
            int8 native_wid,
            uint256 native_addr,

            string memory name,
            string memory symbol,
            uint8 decimals,

            uint128 amount,
            uint160 recipient,
            uint256 chainId
        ) = abi.decode(
            eventData,
            (
                int8, uint256,
                string, string, uint8,
                uint128, uint160, uint256
            )
        );

        return NativeWithdrawalParams({
            native: IEverscale.EverscaleAddress(native_wid, native_addr),
            meta: IMultiVault.TokenMeta(name, symbol, decimals),
            amount: amount,
            recipient: address(recipient),
            chainId: chainId
        });
    }

    function decodeAlienWithdrawalEventData(
        bytes memory eventData
    ) internal pure returns (IMultiVault.AlienWithdrawalParams memory) {
        (
            uint160 token,
            uint128 amount,
            uint160 recipient,
            uint256 chainId
        ) = abi.decode(
            eventData,
            (uint160, uint128, uint160, uint256)
        );

        return AlienWithdrawalParams({
            token: address(token),
            amount: uint256(amount),
            recipient: address(recipient),
            chainId: chainId
        });
    }

    /// @notice Calculates the CREATE2 address for token, based on the Everscale sig
    /// @param native_wid Everscale token workchain ID
    /// @param native_addr Everscale token address body
    /// @return token Token address
    function getNativeToken(
        int8 native_wid,
        uint256 native_addr
    ) public view returns (address token) {
        token = address(uint160(uint(keccak256(abi.encodePacked(
            hex'ff',
            address(this),
            keccak256(abi.encodePacked(native_wid, native_addr)),
            hex'192c19818bebb5c6c95f5dcb3c3257379fc46fb654780cb06f3211ee77e1a360' // MultiVaultToken init code hash
        )))));
    }

    /**
        @notice Set approve status for pending withdrawal.
            Pending withdrawal must be in `Required` (1) approve status, so approve status can be set only once.
            If Vault has enough tokens on its balance - withdrawal will be filled immediately.
            This may only be called by `governance` or `withdrawGuardian`.
        @param pendingWithdrawalId Pending withdrawal ID.
        @param approveStatus Approve status. Must be `Approved` (2) or `Rejected` (3).
    */
    function setPendingWithdrawalApprove(
        PendingWithdrawalId memory pendingWithdrawalId,
        ApproveStatus approveStatus
    )
        public
        override
        onlyGovernanceOrWithdrawGuardian
        pendingWithdrawalOpened(pendingWithdrawalId)
    {
        PendingWithdrawalParams memory pendingWithdrawal = _pendingWithdrawal(pendingWithdrawalId);

        require(pendingWithdrawal.approveStatus == ApproveStatus.Required);

        require(
            approveStatus == ApproveStatus.Approved ||
            approveStatus == ApproveStatus.Rejected
        );

        _pendingWithdrawalApproveStatusUpdate(pendingWithdrawalId, approveStatus);

        // Fill approved withdrawal
        if (approveStatus == ApproveStatus.Approved && pendingWithdrawal.amount <= _vaultTokenBalance(pendingWithdrawal.token)) {
            _pendingWithdrawalAmountReduce(
                pendingWithdrawal.token,
                pendingWithdrawalId,
                pendingWithdrawal.amount
            );

            IERC20(pendingWithdrawal.token).safeTransfer(
                pendingWithdrawalId.recipient,
                pendingWithdrawal.amount
            );

            emit PendingWithdrawalWithdraw(
                pendingWithdrawalId.recipient,
                pendingWithdrawalId.id,
                pendingWithdrawal.amount
            );
        }

        // Update withdrawal period considered amount
        uint withdrawalPeriodId = _withdrawalPeriodDeriveId(pendingWithdrawal.timestamp);

        withdrawalPeriods_[pendingWithdrawal.token][withdrawalPeriodId].considered += pendingWithdrawal.amount;
    }

    /**
        @notice Multicall for `setPendingWithdrawalApprove`.
        @param pendingWithdrawalId List of pending withdrawals IDs.
        @param approveStatus List of approve statuses.
    */
    function setPendingWithdrawalApprove(
        PendingWithdrawalId[] memory pendingWithdrawalId,
        ApproveStatus[] memory approveStatus
    ) external override {
        require(pendingWithdrawalId.length == approveStatus.length);

        for (uint i = 0; i < pendingWithdrawalId.length; i++) {
            setPendingWithdrawalApprove(pendingWithdrawalId[i], approveStatus[i]);
        }
    }
}
