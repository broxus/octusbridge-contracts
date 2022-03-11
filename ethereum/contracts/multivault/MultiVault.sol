// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./../interfaces/multivault/IMultiVault.sol";
import "./../interfaces/multivault/IMultiVaultToken.sol";
import "./../interfaces/IBridge.sol";
import "./../interfaces/vault/IVault.sol";

import "./../libraries/MultiVaultLibrary.sol";

import "./MultiVaultToken.sol";
import "./../utils/ChainId.sol";


uint constant MAX_BPS = 10_000;
uint constant FEE_LIMIT = MAX_BPS / 2;
address constant ZERO_ADDRESS = address(0);


string constant API_VERSION = '0.1.0';


/// @notice Octus bridge Vault for multiple tokens.
/// Inspired by Yearn Vault V2.
contract MultiVault is IMultiVault, ReentrancyGuard, Initializable, ChainId {
    using SafeERC20 for IERC20;

//    function getInitHash() public pure returns(bytes32){
//        bytes memory bytecode = type(MultiVaultToken).creationCode;
//        return keccak256(abi.encodePacked(bytecode));
//    }
//
    mapping (address => Token) public tokens;

    uint public override defaultDepositFee;
    uint public override defaultWithdrawFee;

    bool public override emergencyShutdown;

    address public override bridge;
    mapping(bytes32 => bool) public override withdrawalIds;
    EverscaleAddress public rewards_;
    EverscaleAddress public configuration_;

    address public override governance;
    address pendingGovernance;
    address public override guardian;
    address public override management;

    /// @notice Rewards address
    /// @return Everscale address, used for collecting rewards.
    function rewards()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return rewards_;
    }

    /// @notice Configuration address
    /// @return Everscale address, used for verifying `saveWithdraw` payloads
    function configuration()
        external
        view
        override
    returns (EverscaleAddress memory) {
        return configuration_;
    }

    modifier tokenNotBlacklisted(address token) {
        require(!tokens[token].blacklisted);

        _;
    }

    modifier initializeToken(address token) {
        if (tokens[token].activation == 0) {
            // Non-activated tokens are always native
            TokenSource memory source = TokenSource(
                TokenType.EVM,
                MultiVaultLibrary.encodeEvmTokenSourceMeta(getChainID(), token)
            );

            TokenMeta memory meta = TokenMeta(
                IERC20Metadata(token).name(),
                IERC20Metadata(token).symbol(),
                IERC20Metadata(token).decimals()
            );

            _activateToken(token, source, meta);
        }

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

    modifier respectFeeLimit(uint fee) {
        require(fee <= FEE_LIMIT);

        _;
    }

    /// @notice Vault API version. Used to track the deployed version of this contract.
    //  @return api_version Current API version
    function apiVersion()
        external
        override
        pure
        returns (string memory api_version)
    {
        return API_VERSION;
    }

    /// @notice MultiVault initializer
    /// @param _bridge Bridge address
    /// @param _governance Governance address
    /// @param _rewards Everscale address for receiving rewards
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

    /// @notice Add token to blacklist. Only native token can be blacklisted.
    /// Blacklisted tokens cant be deposited or withdrawn.
    /// @param token Token address
    function blacklistAddToken(
        address token
    ) public override onlyGovernance tokenNotBlacklisted(token) {
        tokens[token].blacklisted = true;

        emit BlacklistTokenAdded(token);
    }

    /// @notice Remove token from blacklist.
    /// @param token Token address
    function blacklistRemoveToken(
        address token
    ) external override onlyGovernance {
        require(tokens[token].blacklisted);

        tokens[token].blacklisted = false;

        emit BlacklistTokenRemoved(token);
    }

    /// @notice Set bridge address.
    /// This may be called only by `governance`
    /// @param _bridge Bridge address
    function setBridge(
        address _bridge
    ) external override onlyGovernance {
        bridge = _bridge;

        emit UpdateBridge(bridge);
    }

    /// @notice Set address to receive fees.
    /// This may be called only by `governance`
    /// @param _rewards Rewards receiver in Everscale network
    function setRewards(
        EverscaleAddress memory _rewards
    ) external override onlyGovernance {
        rewards_ = _rewards;

        emit UpdateRewards(rewards_.wid, rewards_.addr);
    }

    /// @notice Set default deposit fee.
    /// @param _defaultDepositFee Default deposit fee, should be less than FEE_LIMIT
    function setDefaultDepositFee(
        uint _defaultDepositFee
    )
        external
        override
        onlyGovernanceOrManagement
        respectFeeLimit(_defaultDepositFee)
    {
        defaultDepositFee = _defaultDepositFee;

        emit UpdateDefaultDepositFee(defaultDepositFee);
    }

    /// @notice Set default withdraw fee.
    /// @param _defaultWithdrawFee Default withdraw fee, should be less than FEE_LIMIT
    function setDefaultWithdrawFee(
        uint _defaultWithdrawFee
    )
        external
        override
        onlyGovernanceOrManagement
        respectFeeLimit(_defaultWithdrawFee)
    {
        defaultWithdrawFee = _defaultWithdrawFee;

        emit UpdateDefaultWithdrawFee(defaultWithdrawFee);
    }

    /// @notice Set deposit fee for specific token.
    /// This may be called only by `owner` or `management`.
    /// @param token Token address
    /// @param _depositFee Deposit fee, must be less than FEE_LIMIT.
    function setTokenDepositFee(
        address token,
        uint _depositFee
    )
        public
        override
        onlyGovernanceOrManagement
        tokenNotBlacklisted(token)
        respectFeeLimit(_depositFee)
    {
        tokens[token].depositFee = _depositFee;

        emit UpdateTokenDepositFee(token, _depositFee);
    }

    /// @notice Set withdraw fee for specific token.
    /// This may be called only by `governance` or `management`
    /// @param token Token address, must be enabled
    /// @param _withdrawFee Withdraw fee, must be less than FEE_LIMIT.
    function setTokenWithdrawFee(
        address token,
        uint _withdrawFee
    )
        public
        override
        onlyGovernanceOrManagement
        tokenNotBlacklisted(token)
        respectFeeLimit(_withdrawFee)
    {
        tokens[token].withdrawFee = _withdrawFee;

        emit UpdateTokenWithdrawFee(token, _withdrawFee);
    }

    /// @notice Set configuration address.
    /// @param _configuration The address to use for configuration.
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
    )
        external
        override
        onlyGovernanceOrGuardian
    {
        guardian = _guardian;

        emit UpdateGuardian(guardian);
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

        emit EmergencyShutdown(active);
    }

    /// @notice Transfer tokens to the Everscale.
    /// @param recipient Everscale recipient.
    /// @param token Native token address, should not be blacklisted.
    /// @param amount Amount of tokens to transfer.
    /// @param depositType Deposit type.
    function deposit(
        EverscaleAddress memory recipient,
        address token,
        uint amount,
        DepositType depositType
    )
        external
        override
        nonReentrant
        tokenNotBlacklisted(token)
        initializeToken(token)
        onlyEmergencyDisabled
    {
        if (depositType == DepositType.Burn) {
            require(tokens[token].activation > 0);
        }

        uint fee = calculateMovementFee(amount, token, Fee.Deposit);

        if (depositType == DepositType.Store) {
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );
        } else {
            IMultiVaultToken(token).burn(
                msg.sender,
                amount
            );
        }

        _transferToEverscale(token, recipient, amount - fee, depositType);

        if (fee > 0) _transferToEverscale(token, rewards_, fee, depositType);
    }

    /// @notice Save withdraw
    /// @param payload Withdraw payload
    /// @param signatures Payload signatures
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
        WithdrawalParams memory withdrawal = MultiVaultLibrary.decodeWithdrawalEventData(_event.eventData);

        // Ensure chain id is correct
        require(withdrawal.chainId == getChainID());

        // Derive token address
        // Depends on the withdrawn token source
        address token = _deriveWithdrawalToken(withdrawal);

        if (withdrawal.depositType == DepositType.Burn) {
            require(tokens[token].activation > 0);
        }

        // Ensure token is not blacklisted
        require(!tokens[token].blacklisted);

        // Consider movement fee and send it to `rewards_`
        uint256 fee = calculateMovementFee(
            withdrawal.amount,
            token,
            Fee.Withdraw
        );

        // If token was burned on the Everscale side, than the EVM token need
        // to be transferred.
        if (withdrawal.depositType == DepositType.Burn) {
            IERC20(token).safeTransfer(
                withdrawal.recipient,
                withdrawal.amount - fee
            );
        } else {
            IMultiVaultToken(token).mint(
                withdrawal.recipient,
                withdrawal.amount - fee
            );
        }

        if (fee > 0) {
            _transferToEverscale(
                token,
                rewards_,
                fee,
                withdrawal.depositType == DepositType.Burn ? DepositType.Store : DepositType.Burn
            );
        }
    }

    function migrateTokenToVault(
        address token,
        address vault
    )
        external
        override
        onlyGovernance
    {
        require(IVault(vault).token() == token);
        require(IVault(token).governance() == governance);

        tokens[token].blacklisted = true;

        IERC20(token).safeTransfer(
            vault,
            IERC20(token).balanceOf(address(this))
        );

        emit TokenMigrated(token, vault);
    }

    /// @notice Calculates fee for deposit or withdrawal.
    /// @param amount Amount of tokens.
    /// @param _token Token address.
    /// @param fee Fee type (Deposit = 0, Withdraw = 1).
    function calculateMovementFee(
        uint256 amount,
        address _token,
        Fee fee
    ) public view returns (uint256) {
        Token memory token = tokens[_token];

        uint tokenFee = fee == Fee.Deposit ? token.depositFee : token.withdrawFee;

        return tokenFee * amount / MAX_BPS;
    }

    function tokenFor(
        TokenType _type,
        bytes memory meta
    ) external view returns (address token) {
        token = MultiVaultLibrary.tokenFor(_type, meta);
    }

    function _activateToken(
        address token,
        TokenSource memory source,
        TokenMeta memory meta
    ) internal {
        tokens[token].activation = block.number;
        tokens[token].blacklisted = false;
        tokens[token].source = source;
        tokens[token].meta = meta;
        tokens[token].depositFee = defaultDepositFee;
        tokens[token].withdrawFee = defaultWithdrawFee;

        emit TokenInitialized(
            token,
            block.number,
            source._type,
            source.meta,
            meta.name,
            meta.symbol,
            meta.decimals,
            defaultDepositFee,
            defaultWithdrawFee
        );
    }

    function _transferToEverscale(
        address _token,
        EverscaleAddress memory recipient,
        uint amount,
        DepositType depositType
    ) internal {
        Token memory token = tokens[_token];

        emit Deposit(
            depositType,
            token.source._type,
            token.source.meta,
            token.meta.name,
            token.meta.symbol,
            token.meta.decimals,
            amount,
            recipient.wid,
            recipient.addr
        );
    }

    function _deriveWithdrawalToken(
        WithdrawalParams memory withdrawal
    ) internal returns (address token) {
        // Check source token is native to the current network
        if (withdrawal.source._type == TokenType.EVM) {
            (
                uint256 chainId,
                address _token
            ) = MultiVaultLibrary.decodeEvmTokenSourceMeta(
                withdrawal.source.meta
            );

            if (chainId == getChainID()) return _token;
        }

        token = MultiVaultLibrary.tokenFor(
            withdrawal.source._type,
            withdrawal.source.meta
        );

        if (tokens[token].activation == 0) {
            _deployToken(withdrawal.source, withdrawal.meta);
            _activateToken(token, withdrawal.source, withdrawal.meta);
        }
    }

    function _deployToken(
        TokenSource memory source,
        TokenMeta memory meta
    ) internal returns (address token) {
        bytes memory bytecode = type(MultiVaultToken).creationCode;

        bytes32 salt = keccak256(abi.encodePacked(source._type, source.meta));

        assembly {
            token := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        IMultiVaultToken(token).initialize(
            string(abi.encodePacked(meta.name, ' (Octus)')),
            string(abi.encodePacked(meta.symbol, '_OCTUS')),
            meta.decimals
        );

        emit TokenCreated(
            token,
            source._type,
            source.meta,
            meta.name,
            meta.symbol,
            meta.decimals
        );
    }
}