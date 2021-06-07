pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./libraries/MsgFlag.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./libraries/PlatformTypes.sol";
import "./utils/Platform.sol";


contract UserData is IUserData, IUpgradableByRequest {
    event UserDataCodeUpgraded(uint32 code_version);

    uint32 public current_version;
    TvmCell public platform_code;

    uint256 public token_balance;
    uint256 public reward_balance;
    uint256 public reward_debt;

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
        } else {
            uint256 prev_token_balance = token_balance;
            uint256 prev_reward_debt = reward_debt;

            token_balance += _tokens_to_deposit;
            reward_debt = (token_balance * _acc_reward_per_share) / 1e18;

            uint256 new_reward = ((prev_token_balance * _acc_reward_per_share) / 1e18) - prev_reward_debt;
            reward_balance += new_reward;

            IStakingPool(msg.sender).finishDeposit{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
        }

    }

    function processBecomeRelay(uint128 round_num, uint128 election_start_time) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
        
        address election_addr = getElectionAddress(round_num);



    }

    function processWithdraw(uint128 _tokens_to_withdraw, uint256 _acc_reward_per_share, address send_gas_to) external override onlyRoot {
        tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);

        // bad input. User does not have enough staked balance. At least we can return some gas
        if (_tokens_to_withdraw > token_balance) {
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

    function upgrade(TvmCell code, uint32 code_version, address send_gas_to) external override onlyRoot {
        if (code_version == current_version) {
            tvm.rawReserve(Gas.USER_DATA_INITIAL_BALANCE, 2);
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit UserDataCodeUpgraded(code_version);

            TvmBuilder builder;

            builder.store(root);
            builder.store(user);
            builder.store(current_version);
            builder.store(code_version);
            builder.store(send_gas_to);
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
}
