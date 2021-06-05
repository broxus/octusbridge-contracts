pragma ton-solidity ^0.39.0;

import "./interfaces/IRelayRound.sol";
import "./libraries/StakingErrors.sol";
import "./libraries/Gas.sol";
import "./libraries/MsgFlag.sol";

contract RelayRound is IRelayRound {
    event RelayRoundCodeUpgraded(uint32 code_version);

    bool relays_installed;
    uint128 round_num; // setup from initialData
    Relay[] public relay_list; // on initialization, descending sort by staked amount

    uint32 public current_version;
    TvmCell public platform_code;

    address public root; // setup from initialData

    // Cant be deployed directly
    constructor() public { revert(); }

    function getDetails() external view responsible returns (RelayRoundDetails) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }RelayRoundDetails(
            root, round_num, relay_list, relays_installed, current_version
        );
    }

    function getRelayByTonAddress(address relay) public view responsible returns (Relay) {
        for (uint i = 0; i < relay_list.length; i++) {
            Relay _relay = relay_list[i];
            if (_relay.ton_addr == relay) {
                return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }_relay;
            }
        }
        return Relay(address(0), 0, 0);
    }

    function setRelays(Relay[] _relay_list) external onlyRoot {
        require (!relays_installed, StakingErrors.RELAY_ROUND_INITIALIZED);
        tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);

        relay_list = _relay_list;
        relays_installed = true;
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

    function upgrade(TvmCell code, uint32 code_version, address send_gas_to) external onlyRoot {
        if (code_version == current_version) {
            tvm.rawReserve(Gas.RELAY_ROUND_INITIAL_BALANCE, 2);
            send_gas_to.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit RelayRoundCodeUpgraded(code_version);

            TvmBuilder builder;

            builder.store(root);
            builder.store(round_num);
            builder.store(current_version);
            builder.store(code_version);
            builder.store(send_gas_to);

            builder.store(relay_list);
            builder.store(relays_installed);

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
