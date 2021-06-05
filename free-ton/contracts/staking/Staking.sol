pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

import "./interfaces/IRootTokenContract.sol";
import "./interfaces/ITONTokenWallet.sol";
import "./interfaces/ITokensReceivedCallback.sol";
import "./interfaces/IUserData.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./interfaces/IStakingPool.sol";
import "./UserData.sol";
import "./Election.sol";
import "./utils/Platform.sol";
import "./RelayRound.sol";

import "./libraries/PlatformTypes.sol";
import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./libraries/MsgFlag.sol";


contract StakingPool is ITokensReceivedCallback, IStakingPool {
    // Events
    event Deposit(address user, uint128 amount);
    event Withdraw(address user, uint128 amount);
    event ElectionStarted(uint128 round_num);

    event DepositReverted(address user, uint128 amount);

    event ActiveUpdated(bool active);

    event RequestedUserDataUpgrade(address user);
    event RequestedElectionUpgrade(uint128 round_num);
    event RequestedRelayRoundUpgrade(uint128 round_num);

    event UserDataCodeUpgraded(uint32 code_version);
    event ElectionCodeUpgraded(uint32 code_version);
    event RelayRoundCodeUpgraded(uint32 code_version);

//    struct TvmCell {} // TODO: delete
//    struct TvmSlice {} // TODO: delete

    uint32 public static deploy_nonce; // TODO: uncomment

    TvmCell public platform_code;
    bool public has_platform_code;

    TvmCell public user_data_code;
    uint32 public user_data_version;

    TvmCell public election_code;
    uint32 public election_version;

    TvmCell public relay_round_code;
    uint32 public relay_round_version;


    // payloads for token receive callback
    uint8 public constant STAKE_DEPOSIT = 0;
    uint8 public constant REWARD_UP = 1;

    bool active;

    // State vars
    uint256 constant public rewardPerSecond = 1000;

    uint128 constant public relayRoundTime = 7 days;

    uint128 constant public electionTime = 2 days;

    // election should start at lest after this much time before round end
    uint128 constant public timeBeforeElection = 4 days;

    uint128 public currentRelayRound = 1;

    // time when current round have started
    uint128 public currentRelayRoundStartTime;

    // time when current election have started
    uint128 public currentElectionStartTime;

    // 0 means no pending relay round
    uint128 public pendingRelayRound;

    uint256 public accRewardPerShare;

    uint256 public lastRewardTime;

    address public tokenRoot;

    address public tokenWallet;

    uint256 public tokenBalance;

    uint256 public unclaimedReward;

    uint256 public rewardTokenBalance;

    uint256 public totalReward;

    address public owner;

    struct PendingDeposit {
        address user;
        uint128 amount;
        address send_gas_to;
    }

    uint64 public deposit_nonce = 0;
    // this is used to prevent data loss on bounced messages during deposit
    mapping (uint64 => PendingDeposit) deposits;

    TvmCell public userDataCode;

    TvmCell public electionCode;

    TvmCell public relayRoundCode;

    constructor(address _owner, address _tokenRoot) public {
        tvm.accept();

        tokenRoot = _tokenRoot;
        owner = _owner;
        setUpTokenWallets();
    }
    
    function installPlatformOnce(TvmCell code, address send_gas_to) external onlyOwner {
        // can be installed only once
        require(!has_platform_code, StakingErrors.PLATFORM_CODE_NON_EMPTY);
        tvm.rawReserve(_reserve(), 2);
        platform_code = code;
        has_platform_code = true;
        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateUserDataCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        user_data_code = code;
        user_data_version++;
        emit UserDataCodeUpgraded(user_data_version);
        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateElectionCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        election_code = code;
        election_version++;
        emit ElectionCodeUpgraded(election_version);
        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateRelayRoundCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        relay_round_code = code;
        relay_round_version++;
        emit RelayRoundCodeUpgraded(relay_round_version);
        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    // Active

    function setActive(bool new_active, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        if (new_active && has_platform_code && user_data_version > 0 && election_version > 0 && relay_round_version > 0) {
            active = true;
        } else {
            active = false;
        }
        emit ActiveUpdated(active);
        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function isActive() external view responsible returns (bool) {
        return{ value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } active;
    }

    modifier onlyActive() {
        require(active, StakingErrors.NOT_ACTIVE);
        _;
    }

    function getUserDataVersion() external view responsible returns (uint32) {
        return{ value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } user_data_version;
    }

    function getElectionVersion() external view responsible returns (uint32) {
        return{ value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } election_version;
    }

    function getRelayRoundVersion() external view responsible returns (uint32) {
        return{ value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } relay_round_version;
    }

    // user should call this by himself
    function upgradeUserData(
        address user,
        address send_gas_to
    ) external view {
        require(msg.value >= Gas.UPGRADE_USER_DATA_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(user);
        IUpgradableByRequest(user_data).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            user_data_code,
            user_data_version,
            send_gas_to
        );
    }

    function forceUpgradeUserData(
        address user,
        address send_gas_to
    ) external view onlyOwner {
        require(msg.value >= Gas.UPGRADE_USER_DATA_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        address user_data = getUserDataAddress(user);
        IUpgradableByRequest(user_data).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            user_data_code,
            user_data_version,
            send_gas_to
        );
    }

    function upgradeElection(
        uint128 round_num,
        address send_gas_to
    ) external view onlyOwner {
        require(msg.value >= Gas.UPGRADE_ELECTION_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedElectionUpgrade(round_num);
        IUpgradableByRequest(address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        ))))
        .upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(election_code, election_version, send_gas_to);
    }

    function upgradeRelayRound(
        uint128 round_num,
        address send_gas_to
    ) external view onlyOwner {
        require(msg.value >= Gas.UPGRADE_RELAY_ROUND_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedRelayRoundUpgrade(round_num);
        IUpgradableByRequest(address(tvm.hash(_buildInitData(
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        ))))
        .upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(relay_round_code, relay_round_version, send_gas_to);
    }

    function _reserve() internal view returns (uint128) {
        return math.max(address(this).balance - msg.value, Gas.ROOT_INITIAL_BALANCE);
    }

    /*
        @notice Creates token wallet for configured root token
    */
    function setUpTokenWallets() internal view {
        // Deploy vault's token wallet
        IRootTokenContract(tokenRoot).deployEmptyWallet{value: Gas.TOKEN_WALLET_DEPLOY_VALUE}(
            Gas.TOKEN_WALLET_DEPLOY_VALUE / 2, // deploy grams
            0, // owner pubkey
            address(this), // owner address
            address(this) // gas refund address
        );

        // Request for token wallet address
        IRootTokenContract(tokenRoot).getWalletAddress{
            value: Gas.GET_WALLET_ADDRESS_VALUE, callback: StakingPool.receiveTokenWalletAddress
        }(0, address(this));
    }

    /*
        @notice Store vault's token wallet address
        @dev Only root can call with correct params
        @param wallet Farm pool's token wallet
    */
    function receiveTokenWalletAddress(
        address wallet
    ) external {
        if (msg.sender == tokenRoot) {
            tokenWallet = wallet;
            ITONTokenWallet(wallet).setReceiveCallback{value: 0.05 ton}(address(this), false);
        }
    }

    // deposit occurs here
    function tokensReceivedCallback(
        address token_wallet,
        address token_root,
        uint128 amount,
        uint256 sender_public_key,
        address sender_address,
        address sender_wallet,
        address original_gas_to,
        uint128 updated_balance,
        TvmCell payload
    ) external override {
        tvm.rawReserve(_reserve(), 2);

        TvmSlice slice = payload.toSlice();
        uint8 deposit_type = slice.decode(uint8);

        if (msg.sender == tokenWallet) {
            if (sender_address.value == 0 || msg.value < Gas.MIN_DEPOSIT_MSG_VALUE || !active) {
                // external owner or too low msg.value
                TvmCell tvmcell;
                ITONTokenWallet(tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                    sender_wallet,
                    amount,
                    0,
                    original_gas_to,
                    false,
                    tvmcell
                );
                return;
            }

            updatePoolInfo();

            if (deposit_type == STAKE_DEPOSIT) {
                deposit_nonce += 1;
                deposits[deposit_nonce] = PendingDeposit(sender_address, amount, original_gas_to);

                address userDataAddr = getUserDataAddress(sender_address);
                UserData(userDataAddr).processDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(deposit_nonce, amount, accRewardPerShare, user_data_version);
            } else if (deposit_type == REWARD_UP) {
                rewardTokenBalance += amount;
                original_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            } else {
                TvmCell tvmcell;
                ITONTokenWallet(tokenWallet).transfer{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                    sender_wallet,
                    amount,
                    0,
                    original_gas_to,
                    false,
                    tvmcell
                );
            }
        }
    }

    function revertDeposit(uint64 _deposit_nonce) external override {
        PendingDeposit deposit = deposits[_deposit_nonce];
        address expectedAddr = getUserDataAddress(deposit.user);
        require (expectedAddr == msg.sender, StakingErrors.NOT_USER_DATA);

        tvm.rawReserve(_reserve(), 2);

        PendingDeposit _deposit = deposits[_deposit_nonce];
        delete deposits[_deposit_nonce];

        emit DepositReverted(_deposit.user, _deposit.amount);

        TvmCell _empty;
        ITONTokenWallet(tokenWallet).transferToRecipient{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            0, _deposit.user, _deposit.amount, 0, 0, _deposit.send_gas_to, false, _empty
        );
    }

    function finishDeposit(uint64 _deposit_nonce) external override {
        PendingDeposit deposit = deposits[_deposit_nonce];
        address expectedAddr = getUserDataAddress(deposit.user);
        require (expectedAddr == msg.sender, StakingErrors.NOT_USER_DATA);

        tvm.rawReserve(_reserve(), 2);

        tokenBalance += deposit.amount;

        delete deposits[_deposit_nonce];
        emit Deposit(deposit.user, deposit.amount);

        deposit.send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function becomeRelayNextRound() external override onlyActive {
        require (msg.sender.value != 0, StakingErrors.EXTERNAL_CALL);
        require (msg.value >= Gas.MIN_RELAY_REQ_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        address userDataAddr = getUserDataAddress(msg.sender);
        UserData(userDataAddr).processBecomeRelay{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}();
    }

    // TODO: update
    function withdraw(uint128 amount, address send_gas_to) public onlyActive {
        require (msg.sender.value != 0, StakingErrors.EXTERNAL_CALL);
        require (amount > 0, StakingErrors.ZERO_AMOUNT_INPUT);
        require (msg.value >= Gas.MIN_WITHDRAW_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        updatePoolInfo();

        address userDataAddr = getUserDataAddress(msg.sender);
        // we cant check if user has any balance here, delegate it to UserData
        UserData(userDataAddr).processWithdraw{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(amount, accRewardPerShare, send_gas_to);
    }

    function finishWithdraw(
        address user,
        uint128 withdraw_amount,
        address send_gas_to
    ) public override onlyUserData(user) {
        tvm.rawReserve(_reserve(), 2);

        tokenBalance -= withdraw_amount;

        emit Withdraw(user, withdraw_amount);
        TvmCell tvmcell;
        ITONTokenWallet(tokenWallet).transferToRecipient{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            0, user, withdraw_amount, 0, 0, send_gas_to, false, tvmcell
        );
    }

    // TODO: update
//    function withdrawUnclaimed(address to) external onlyOwner {
//        require (now >= (farmEndTime + 24 hours), StakingErrors.FARMING_NOT_ENDED);
//        // minimum value that should remain on contract
//        tvm.rawReserve(CONTRACT_MIN_BALANCE, 2);
//
//        transferReward(to, rewardTokenBalance);
//    }

    // user_amount and user_reward_debt should be fetched from UserData at first
    function pendingReward(uint256 user_amount, uint256 user_reward_debt) external view returns (uint256, uint256) {
        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 _totalReward = totalReward;
        if (now > lastRewardTime && tokenBalance != 0) {
            uint256 multiplier = now - lastRewardTime;
            uint256 tonReward = multiplier * rewardPerSecond;
            _totalReward += tonReward;
            _accRewardPerShare += (tonReward * 1e18) / tokenBalance;
        }
        return (((user_amount * _accRewardPerShare) / 1e18) - user_reward_debt, _totalReward);
    }

    function updatePoolInfo() internal {
        if (now <= lastRewardTime) {
            return;
        }

        uint256 multiplier = now - lastRewardTime;
        uint256 new_reward = rewardPerSecond * multiplier;
        totalReward += new_reward;

        if (tokenBalance == 0) {
            unclaimedReward += new_reward;
            lastRewardTime = now;
            return;
        }

        accRewardPerShare += new_reward * 1e18 / tokenBalance;
        lastRewardTime = now;
    }

    // ---------------- RELAY STAFF -------------------
    function startElectionOnNewRound(address send_gas_to) external override onlyActive {
        require (msg.sender.value != 0, StakingErrors.EXTERNAL_CALL);
        require (msg.value >= Gas.MIN_START_ELECTION_MSG_VALUE, StakingErrors.VALUE_TOO_LOW);
        require (now >= (currentRelayRoundStartTime + timeBeforeElection), StakingErrors.TOO_EARLY_FOR_ELECTION);
        require (currentElectionStartTime == 0, StakingErrors.ELECTION_ALREADY_STARTED);
        tvm.rawReserve(_reserve(), 2);

        deployElection(currentRelayRound + 1, send_gas_to);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function onElectionStarted(uint128 round_num) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentElectionStartTime = now;
        pendingRelayRound = round_num;
        emit ElectionStarted(round_num);
    }

    function onElectionEnded(uint128 round_num) external override onlyElection(round_num) {
        tvm.rawReserve(_reserve(), 2);

        currentElectionStartTime = 0;
        pendingRelayRound = 0;
        emit ElectionEnded(round_num);
    }

    function _buildElectionParams(uint128 round_num) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildUserDataParams(address user) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(user);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint128 round_num) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildInitData(uint8 type_id, TvmCell _initialData) private inline view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: address(this),
                platformType: type_id,
                initialData: _initialData,
                platformCode: platform_code
            },
            pubkey: 0,
            code: platform_code
        });
    }

    function deployElection(uint128 round_num, address send_gas_to) internal returns (address) {
        require(msg.value >= Gas.DEPLOY_ELECTION_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        require(round_num > currentRelayRound, StakingErrors.INVALID_ELECTION_ROUND);

        tvm.rawReserve(_reserve(), 2);
        TvmBuilder constructor_params;
        constructor_params.store(election_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.Election, _buildElectionParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployRelayRound(uint128 round_num, address send_gas_to) internal returns (address) {
        require(msg.value >= Gas.DEPLOY_RELAY_ROUND_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        require(round_num > currentRelayRound, StakingErrors.INVALID_RELAY_ROUND_ROUND);

        tvm.rawReserve(_reserve(), 2);
        TvmBuilder constructor_params;
        constructor_params.store(relay_round_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.RelayRound, _buildRelayRoundParams(round_num)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(election_code, constructor_params.toCell(), send_gas_to);
    }

    function deployUserData(address user_data_owner) internal returns (address) {
        require(msg.value >= Gas.DEPLOY_USER_DATA_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);

        tvm.rawReserve(_reserve(), 2);
        TvmBuilder constructor_params;
        constructor_params.store(user_data_version);

        return new Platform{
            stateInit: _buildInitData(PlatformTypes.UserData, _buildUserDataParams(user_data_owner)),
            value: Gas.PLATFORM_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(user_data_code, constructor_params.toCell(), user_data_owner);
    }

    function getUserDataAddress(address user) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.UserData,
            _buildUserDataParams(user)
        )));
    }

    function getElectionAddress(uint128 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function getRelayRoundAddress(uint128 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        )));
    }

    onBounce(TvmSlice slice) external {
        tvm.accept();

        uint32 functionId = slice.decode(uint32);
        // if processing failed - contract was not deployed. Deploy and try again
        if (functionId == tvm.functionId(UserData.processDeposit)) {
            tvm.rawReserve(_reserve(), 2);

            uint64 _deposit_nonce = slice.decode(uint64);
            PendingDeposit deposit = deposits[_deposit_nonce];
            address user_data_addr = deployUserData(deposit.user);
            // try again
            UserData(user_data_addr).processDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(_deposit_nonce, deposit.amount, accRewardPerShare, user_data_version);
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, StakingErrors.NOT_OWNER);
        _;
    }

    modifier onlyUserData(address user) {
        address expectedAddr = getUserDataAddress(user);
        require (expectedAddr == msg.sender, StakingErrors.NOT_USER_DATA);
        _;
    }

    modifier onlyElection(uint128 round_num) {
        address expectedAddr = getElectionAddress(round_num);
        require (expectedAddr == msg.sender, StakingErrors.NOT_ELECTION);
        _;
    }

    modifier onlyRelayRound(uint128 round_num) {
        address expectedAddr = getRelayRoundAddress(round_num);
        require (expectedAddr == msg.sender, StakingErrors.NOT_RELAY_ROUND);
        _;
    }

}
