pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./interfaces/IElection.sol";

import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./libraries/MsgFlag.sol";
import "./libraries/PlatformTypes.sol";

import "./utils/Platform.sol";


contract UserData is IUserData, IUpgradableByRequest {
    event UserDataCodeUpgraded(uint32 code_version);
    event RelayMembershipRequested(uint128 round_num, uint128 tokens, address ton_addr, uint256 eth_addr);

    uint32 public current_version;
    TvmCell public platform_code;

    uint128 public token_balance;
    uint256 public reward_balance;
    uint256 public reward_debt;
    uint128 relay_lock_until;

    address public root; // setup from initialData
    address public user; // setup from initialData

    // Cant be deployed directly
    constructor() public { revert(); }

    function getDetails() external responsible view override returns (UserDataDetails) {
        // TODO: add new vars to Details
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }UserDataDetails(
            token_balance, reward_debt, reward_balance, root, user, current_version
        );
    }

    function processDeposit(uint64 nonce, uint128 _tokens_to_deposit, uint256 _acc_reward_per_share, uint32 code_version) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version) {
            IStakingPool(msg.sender).revertDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
            return;
        }

        uint256 prev_token_balance = token_balance;
        uint256 prev_reward_debt = reward_debt;

        token_balance += _tokens_to_deposit;
        reward_debt = (token_balance * _acc_reward_per_share) / 1e18;

        uint256 new_reward = ((prev_token_balance * _acc_reward_per_share) / 1e18) - prev_reward_debt;
        reward_balance += new_reward;

        IStakingPool(msg.sender).finishDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
    }

    function processBecomeRelay(
        uint128 round_num,
        uint256 eth_addr,
        uint128 lock_time,
        address send_gas_to,
        uint32 user_data_code_version,
        uint32 election_code_version
    ) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (user_data_code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        // lock until end of election + round time + 2 rounds on top of it
        relay_lock_until = now + lock_time;

        address election_addr = getElectionAddress(round_num);
        IElection(election_addr).applyForMembership{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            user, eth_addr, token_balance, send_gas_to, election_code_version
        );
    }

    function relayMembershipRequestAccepted(uint128 round_num, uint128 tokens, uint256 eth_addr, address send_gas_to) external override onlyElection(round_num) {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        emit RelayMembershipRequested(round_num, tokens, user, eth_addr);
        send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
    }

    function processWithdraw(uint128 _tokens_to_withdraw, uint256 _acc_reward_per_share, address send_gas_to, uint32 code_version) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (code_version > current_version || _tokens_to_withdraw > token_balance || now < relay_lock_until) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        uint256 prev_token_balance = token_balance;
        uint256 prev_reward_debt = reward_debt;

        token_balance -= _tokens_to_withdraw;
        reward_debt = (token_balance * _acc_reward_per_share) / 1e18;

        uint256 new_reward = ((prev_token_balance * _acc_reward_per_share) / 1e18) - prev_reward_debt;
        reward_balance += new_reward;

        IStakingPool(msg.sender).finishWithdraw{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(user, _tokens_to_withdraw, send_gas_to);

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

    function _buildElectionParams(uint128 round_num) private inline pure returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function getElectionAddress(uint128 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        user = initialData.decode(address);

        TvmSlice params = s.loadRefAsSlice();
        current_version = params.decode(uint32);

        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        if (new_version == current_version) {
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit UserDataCodeUpgraded(new_version);

            TvmBuilder builder;

            builder.store(root);
            builder.store(user);
            builder.store(current_version);
            builder.store(new_version);
            builder.store(send_gas_to);
            builder.store(relay_lock_until);
            builder.store(token_balance);
            builder.store(reward_balance);
            builder.store(reward_debt);

            builder.store(platform_code);

            // set code after complete this method
            tvm.setcode(code);

            // run onCodeUpgrade from new code
            tvm.setCurrentCode(code);
            onCodeUpgrade(builder.toCell());
        }
    }

    modifier onlyRoot() {
        require(msg.sender == root, StakingErrors.NOT_ROOT);
        _;
    }

    modifier onlyElection(uint128 round_num) {
        address election_addr = getElectionAddress(round_num);
        require (election_addr == msg.sender, StakingErrors.NOT_ELECTION);
        _;
    }
}
