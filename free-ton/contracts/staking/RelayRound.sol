pragma ton-solidity ^0.39.0;

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
    uint256 public relays_count;
    uint128 public start_time;
    uint128 public round_len;
    uint128 public total_tokens_staked;
    uint128 public reward_round;
    uint128 public round_reward;

    uint128 public round_num; // setup from initialData
    mapping (address => Relay) relays; // key - staker address

    uint32 public current_version;
    TvmCell public platform_code;

    address public root; // setup from initialData

    // Cant be deployed directly
    constructor() public { revert(); }

    function getRelayByStakerAddress(address staker_addr) external view responsible returns (Relay) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} relays[staker_addr];
    }

    function getRewardForRound(address staker_addr, address send_gas_to, uint32 code_version) external override onlyUserData(staker_addr) {
        require (now >= start_time + round_len, ErrorCodes.RELAY_ROUND_NOT_ENDED);
        require (relays[staker_addr].reward_claimed == false, ErrorCodes.RELAY_REWARD_CLAIMED);

        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        if (code_version > current_version) {
            send_gas_to.transfer(0, false, MsgFlag.ALL_NOT_RESERVED);
            return;
        }

        relays[staker_addr].reward_claimed = true;
        uint128 staker_reward_share = math.muldiv(relays[staker_addr].staked_tokens, 1e18, total_tokens_staked);
        uint128 relay_reward = math.muldiv(staker_reward_share, round_reward, 1e18);

        IUserData(msg.sender).receiveRewardForRelayRound(round_num, reward_round, relay_reward, send_gas_to);
    }

    function _getRelayList() internal view returns (Relay[]) {
        Relay[] _relays_list = new Relay[](relays_count);
        optional(address, Relay) min_relay = relays.min();
        uint128 counter = 0;
        while (min_relay.hasValue()) {
            (address staker_addr, Relay _relay) = min_relay.get();
            _relays_list[counter] = _relay;
            counter++;
            min_relay = relays.next(staker_addr);
        }
        return _relays_list;
    }

    function getDetails() external view override responsible returns (RelayRoundDetails) {
        Relay[] _relays_list = _getRelayList();

        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }RelayRoundDetails(
            root, round_num, _relays_list, relays_installed, current_version
        );
    }

    function getRelays(address send_gas_to) external override onlyRoot {
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        IStakingPool(msg.sender).receiveRelayRoundRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            round_num, _getRelayList(), send_gas_to
        );
    }

    function relayKeys() public view responsible returns (uint256[]) {
        Relay[] _relays_list = _getRelayList();
        uint256[] _keys = new uint256[](_relays_list.length);
        for (uint256 i = 0; i < _keys.length; i++) {
            _keys[i] = _relays_list[i].ton_pubkey;
        }
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } _keys;
    }

    function setRelays(Relay[] _relay_list, address send_gas_to) external override onlyRoot {
        require (!relays_installed, ErrorCodes.RELAY_ROUND_INITIALIZED);
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        for (Relay _relay: _relay_list) {
            relays[_relay.staker_addr] = _relay;
            total_tokens_staked += _relay.staked_tokens;
        }

        relays_installed = true;
        relays_count = _relay_list.length;

        IStakingPool(root).onRelayRoundInitialized{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            round_num, _relay_list, round_reward, send_gas_to
        );
    }

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        round_num = initialData.decode(uint128);

        TvmSlice params = s.loadRefAsSlice();
        current_version = params.decode(uint32);
        round_len = params.decode(uint128);
        reward_round = params.decode(uint128);
        uint128 reward_per_second = params.decode(uint128);

        round_reward = reward_per_second * round_len;
        start_time = now;

        send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external onlyRoot {
        if (new_version == current_version) {
            tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit RelayRoundCodeUpgraded(new_version);

            TvmBuilder builder;

            builder.store(root);
            builder.store(round_num);
            builder.store(current_version);
            builder.store(new_version);
            builder.store(send_gas_to);

            builder.store(relays);
            builder.store(relays_installed);
            builder.store(relays_count);

            builder.store(platform_code);

            // set code after complete this method
            tvm.setcode(code);

            // run onCodeUpgrade from new code
            tvm.setCurrentCode(code);
            onCodeUpgrade(builder.toCell());
        }
    }

    function _buildInitData(uint8 type_id, TvmCell _initialData) internal inline view returns (TvmCell) {
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

    function _buildUserDataParams(address user) private inline view returns (TvmCell) {
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
