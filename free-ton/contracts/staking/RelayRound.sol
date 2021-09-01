pragma ton-solidity >= 0.39.0;

import "./interfaces/IRelayRound.sol";
import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";

import "./libraries/Gas.sol";
import "./libraries/PlatformTypes.sol";
import "./../utils/ErrorCodes.sol";

import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "../../../node_modules/@broxus/contracts/contracts/platform/Platform.sol";


contract RelayRound is IRelayRound {
    event RelayRoundCodeUpgraded(uint32 code_version);

    bool public relays_installed;
    uint32 public relays_count;
    uint32 public start_time;
    uint32 public round_len;
    uint128 public total_tokens_staked;
    uint32 public reward_round_num;
    uint128 public round_reward;
    bool public duplicate;
    uint8 public expected_packs_num;
    address public election_addr;
    address public prev_round_addr;

    uint32 round_num; // setup from initialData
    uint256[] ton_keys; // array of ton pubkeys
    uint160[] eth_addrs; // array of eth pubkeys
    address[] staker_addrs; // array of staker addrs
    uint128[] staked_tokens; // array of staked tokens

    mapping (address => uint256) addr_to_idx;
    mapping (address => bool) public reward_claimed;

    uint8 public relay_packs_installed;

    // user when sending relays to new relay round
    uint256 public relay_transfer_start_idx = 0;

    uint32 public current_version;
    TvmCell public platform_code;

    address root; // setup from initialData

    // Cant be deployed directly
    constructor() public { revert(); }

    function getDetails() external view override responsible returns (RelayRoundDetails) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }RelayRoundDetails(
            root, round_num, ton_keys, eth_addrs, staker_addrs, staked_tokens, relays_installed, current_version
        );
    }

    function getRelayByStakerAddress(
        address _relay_staker_addr
    ) external view responsible returns (uint256 _ton_key, uint160 _eth_addr, address _staker_addr, uint128 _staked_tokens) {
        require (addr_to_idx.exists(_relay_staker_addr), ErrorCodes.RELAY_NOT_EXIST);
        uint256 idx = addr_to_idx[_relay_staker_addr];
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (ton_keys[idx], eth_addrs[idx], staker_addrs[idx], staked_tokens[idx]);
    }

    function getRewardForRound(address staker_addr, uint32 code_version) external override onlyUserData(staker_addr) {
        require (now >= start_time + round_len, ErrorCodes.RELAY_ROUND_NOT_ENDED);
        require (reward_claimed[staker_addr] == false, ErrorCodes.RELAY_REWARD_CLAIMED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        reward_claimed[staker_addr] = true;
        uint128 staker_reward_share = math.muldiv(staked_tokens[addr_to_idx[staker_addr]], 1e18, total_tokens_staked);
        uint128 relay_reward = math.muldiv(staker_reward_share, round_reward, 1e18);

        IUserData(msg.sender).receiveRewardForRelayRound{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(round_num, reward_round_num, relay_reward);
    }

    function _getRelayListFromIdx(
        uint128 limit, uint256 start_idx
    ) internal view returns (
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens,
        uint256 new_idx
    ) {
        uint256[] _ton_keys_limit = new uint256[](limit);
        uint160[] _eth_addrs_limit = new uint160[](limit);
        address[] _staker_addrs_limit = new address[](limit);
        uint128[] _staked_tokens_limit = new uint128[](limit);

        uint256 cur_idx = start_idx;
        uint128 counter = 0;

        while (counter < limit && cur_idx < ton_keys.length) {
            _ton_keys_limit[counter] = ton_keys[cur_idx];
            _eth_addrs_limit[counter] = eth_addrs[cur_idx];
            _staker_addrs_limit[counter] = staker_addrs[cur_idx];
            _staked_tokens_limit[counter] = staked_tokens[cur_idx];
            counter++;
            cur_idx++;
        }
        return (_ton_keys_limit, _eth_addrs_limit, _staker_addrs_limit, _staked_tokens_limit, cur_idx);
    }

    function sendRelaysToRelayRound(address relay_round_addr, uint32 count) external override onlyRoot {
        tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 2);

        if (relay_transfer_start_idx >= ton_keys.length) {
            IRelayRound(relay_round_addr).setEmptyRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }();
            return;
        }

        (
            uint256[] _ton_keys,
            uint160[] _eth_addrs,
            address[] _staker_addrs,
            uint128[] _staked_tokens,
            uint256 _new_last_idx
        ) = _getRelayListFromIdx(count, relay_transfer_start_idx);
        relay_transfer_start_idx = _new_last_idx;

        IRelayRound(relay_round_addr)
            .setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }
            (_ton_keys, _eth_addrs, _staker_addrs, _staked_tokens);
    }

    function relayKeys() public view responsible returns (uint256[]) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } ton_keys;
    }

    function setEmptyRelays() external override {
        require (msg.sender == election_addr || msg.sender == prev_round_addr || msg.sender == root, ErrorCodes.BAD_SENDER);
        require (!relays_installed, ErrorCodes.RELAY_ROUND_INITIALIZED);

        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        relay_packs_installed += 1;
        _checkRelaysInstalled();
    }

    function setRelays(
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens
    ) external override {
        require (msg.sender == election_addr || msg.sender == prev_round_addr || msg.sender == root, ErrorCodes.BAD_SENDER);
        require (!relays_installed, ErrorCodes.RELAY_ROUND_INITIALIZED);

        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        for (uint i = 0; i < _ton_keys.length; i++) {
            if (_staked_tokens[i] == 0) {
                break;
            }
            ton_keys.push(_ton_keys[i]);
            eth_addrs.push(_eth_addrs[i]);
            staked_tokens.push(_staked_tokens[i]);
            staker_addrs.push(_staker_addrs[i]);

            addr_to_idx[_staker_addrs[i]] = staker_addrs.length - 1;
            total_tokens_staked += _staked_tokens[i];
            relays_count += 1;
        }

        relay_packs_installed += 1;
        _checkRelaysInstalled();
    }

    function _checkRelaysInstalled() internal {
        // tvm.rawReserve should be called before calling this!
        if (relay_packs_installed == expected_packs_num) {
            relays_installed = true;

            IStakingPool(root).onRelayRoundInitialized{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
                round_num, relays_count, round_reward, duplicate, eth_addrs
            );
            return;
        }
        root.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        round_num = initialData.decode(uint32);

        TvmSlice params = s.loadRefAsSlice();
        (current_version, ) = params.decode(uint32, uint32);

        round_len = params.decode(uint32);
        reward_round_num = params.decode(uint32);
        uint128 reward_per_second = params.decode(uint128);
        duplicate = params.decode(bool);
        expected_packs_num = params.decode(uint8);
        election_addr = params.decode(address);
        prev_round_addr = params.decode(address);

        round_reward = reward_per_second * round_len;
        start_time = now;

        IStakingPool(root).onRelayRoundDeployed{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(round_num, duplicate);
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external onlyRoot {
        if (new_version == current_version) {
            tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);
            send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit RelayRoundCodeUpgraded(new_version);

            TvmBuilder builder;
            uint8 _tmp;
            builder.store(root); // 256
            builder.store(_tmp); // 8
            builder.store(send_gas_to); // 256

            builder.store(platform_code); // ref1

            TvmBuilder initial;
            initial.store(round_num);

            builder.storeRef(initial); // ref2

            TvmBuilder params;
            params.store(new_version);
            params.store(current_version);

            builder.storeRef(params); // ref3

            TvmBuilder data_builder;

            TvmBuilder data_builder_1;
            data_builder_1.store(relays_installed); // 1
            data_builder_1.store(relays_count); // 32
            data_builder_1.store(start_time); // 32
            data_builder_1.store(round_len); // 32
            data_builder_1.store(total_tokens_staked); // 128
            data_builder_1.store(reward_round_num); // 32
            data_builder_1.store(round_reward); // 128
            data_builder_1.store(duplicate); // 1
            data_builder_1.store(expected_packs_num); // 8
            data_builder_1.store(eth_addrs); // ref1
            data_builder_1.store(staker_addrs); // ref2

            data_builder.storeRef(data_builder_1);

            TvmBuilder data_builder_2;
            data_builder_2.store(election_addr); // 256
            data_builder_2.store(prev_round_addr); // 256
            data_builder_2.store(staked_tokens); // ref1
            data_builder_2.store(ton_keys); // ref2
            data_builder_2.store(addr_to_idx); // ref3
            data_builder_2.store(reward_claimed); // ref4
            data_builder_2.store(relay_packs_installed); // 8
            data_builder_2.store(relay_transfer_start_idx); // 256

            data_builder.storeRef(data_builder_2);

            builder.storeRef(data_builder); // ref4

            // set code after complete this method
            tvm.setcode(code);

            // run onCodeUpgrade from new code
            tvm.setCurrentCode(code);
            onCodeUpgrade(builder.toCell());
        }
    }

    /*
    upgrade_data
        bits:
            address root
            uint8 dummy
            address send_gas_to
        refs:
            1: platform_code
            2: initial
                bits:
                    uint128 round_num
            3: params:
                bits:
                    uint32 new_version
                    uint32 current_version
            4: data
                refs:
                    1: data_1
                        bits:
                            bool relays_installed
                            uint32 relays_count
                            uint32 start_time
                            uint32 round_len
                            uint128 total_tokens_staked
                            uint32 reward_round_num
                            uint128 round_reward
                            bool duplicate
                            uint8 expected_packs_num
                        refs:
                            1: eth_addrs
                            2: staker_addrs
                    2: data_2
                        bits:
                            address election_addr
                            address prev_round_addr
                            uint8 relay_packs_installed
                            uint256 relay_transfer_start_idx
                        refs:
                            1: staked_tokens
                            2: ton_keys
                            3: addr_to_idx
                            4: reward_claimed
    */

    function _buildInitData(uint8 type_id, TvmCell _initialData) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Platform,
            varInit: {
                root: root,
                platformType: type_id,
                initialData: _initialData,
                platformCode: platform_code
            },
            pubkey: 0,
            code: platform_code
        });
    }

    function _buildUserDataParams(address user) private view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(user);
        return builder.toCell();
    }

    function getUserDataAddress(address user) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.UserData,
            _buildUserDataParams(user)
        )));
    }

    modifier onlyUserData(address user) {
        address expectedAddr = getUserDataAddress(user);
        require (expectedAddr == msg.sender, ErrorCodes.NOT_USER_DATA);
        _;
    }

    modifier onlyRoot() {
        require(msg.sender == root, ErrorCodes.NOT_ROOT);
        _;
    }

}
