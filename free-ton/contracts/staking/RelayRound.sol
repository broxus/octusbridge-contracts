pragma ton-solidity ^0.39.0;

import "./interfaces/IRelayRound.sol";
import "./interfaces/IStakingPool.sol";

import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";

import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";



contract RelayRound is IRelayRound {
    event RelayRoundCodeUpgraded(uint32 code_version);

    bool public relays_installed;
    uint256 public relays_count;
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

    function getDetails() external view responsible returns (RelayRoundDetails) {
        Relay[] _relays_list = new Relay[](relays_count);
        optional(address, Relay) min_relay = relays.min();
        uint128 counter = 0;
        while (min_relay.hasValue()) {
            (address staker_addr, Relay _relay) = min_relay.get();
            _relays_list[counter] = _relay;
            counter++;
            min_relay = relays.next(staker_addr);
        }

        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }RelayRoundDetails(
            root, round_num, _relays_list, relays_installed, current_version
        );
    }

    function setRelays(Relay[] _relay_list, address send_gas_to) external override onlyRoot {
        require (!relays_installed, StakingErrors.RELAY_ROUND_INITIALIZED);
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        for (Relay _relay: _relay_list) {
            relays[_relay.staker_addr] = _relay;
        }

        relays_installed = true;
        relays_count = _relay_list.length;

        IStakingPool(root).onRelayRoundInitialized{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            round_num, _relay_list, send_gas_to
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

    modifier onlyRoot() {
        require(msg.sender == root, StakingErrors.NOT_ROOT);
        _;
    }

}
