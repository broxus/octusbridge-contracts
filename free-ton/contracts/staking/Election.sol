pragma ton-solidity >= 0.57.0;
pragma AbiHeader expire;


import "./interfaces/IStakingPool.sol";
import "./interfaces/IUserData.sol";
import "./interfaces/IUpgradableByRequest.sol";
import "./interfaces/IElection.sol";
import "./interfaces/IRelayRound.sol";

import "./libraries/Gas.sol";
import "./../utils/ErrorCodes.sol";
import "./libraries/PlatformTypes.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "@broxus/contracts/contracts/platform/Platform.sol";


contract Election is IElection {
    event ElectionCodeUpgraded(uint32 code_version);

    uint32 public current_version;
    TvmCell platform_code;

    address public root;
    uint32 public round_num;

    struct Node {
        uint256 prev_node;
        uint256 next_node;
    }

    uint256[] ton_keys; // array of ton pubkeys
    uint160[] eth_addrs; // array of eth pubkeys
    address[] staker_addrs; // array of staker addrs
    uint128[] staked_tokens; // array of staked tokens

    // this array contains 2-way linked list by request tokens
    // nodes are connected in descending order by tokens
    // 0 position node is 'origin' and acting as a special pointer to start/end of list
    Node[] requests_nodes;
    // sorted list starts with this idx
    uint256 list_start_idx;

    bool public election_ended;

    // user when sending relays to new relay round
    uint256 relay_transfer_start_idx = 0;

    // Cant be deployed directly
    constructor() public { revert(); }

    // return sorted list of requests
    function getRequests(uint128 limit) public responsible returns (
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens
    ) {
        (
            uint256[] _ton_keys_limit,
            uint160[] _eth_addrs_limit,
            address[] _staker_addrs_limit,
            uint128[] _staked_tokens_limit,
            uint256 _
        ) = _getRequestsFromIdx(limit, list_start_idx);
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }(
            _ton_keys_limit, _eth_addrs_limit, _staker_addrs_limit, _staked_tokens_limit
        );
    }

    function getNode(uint256 idx) public responsible view returns (
        Node _node,
        uint256 _ton_key,
        uint160 _eth_addr,
        address _staker_addr,
        uint128 _staked_tokens
    ) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }(
            requests_nodes[idx], ton_keys[idx], eth_addrs[idx], staker_addrs[idx], staked_tokens[idx]
        );
    }

    function _getRequestsFromIdx(
        uint128 limit, uint256 start_idx
    ) internal view returns (
        uint256[] _ton_keys,
        uint160[] _eth_addrs,
        address[] _staker_addrs,
        uint128[] _staked_tokens,
        uint256 _new_idx
    ) {
        uint256[] _ton_keys_limit = new uint256[](limit);
        uint160[] _eth_addrs_limit = new uint160[](limit);
        address[] _staker_addrs_limit = new address[](limit);
        uint128[] _staked_tokens_limit = new uint128[](limit);

        uint256 cur_idx = start_idx;
        uint128 counter = 0;

        while (counter < limit && staked_tokens[cur_idx] != 0) {
            _ton_keys_limit[counter] = ton_keys[cur_idx];
            _eth_addrs_limit[counter] = eth_addrs[cur_idx];
            _staker_addrs_limit[counter] = staker_addrs[cur_idx];
            _staked_tokens_limit[counter] = staked_tokens[cur_idx];
            counter++;
            cur_idx = requests_nodes[cur_idx].next_node;
        }
        return (_ton_keys_limit, _eth_addrs_limit, _staker_addrs_limit, _staked_tokens_limit, cur_idx);
    }

    function applyForMembership(
        address staker_addr,
        uint256 ton_pubkey,
        uint160 eth_addr,
        uint128 tokens,
        uint32 lock_time,
        uint32 code_version
    ) external override onlyUserData(staker_addr) {
        require (tokens > 0, ErrorCodes.BAD_RELAY_MEMBERSHIP_REQUEST);
        require (!election_ended, ErrorCodes.ELECTION_ENDED);
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 0);

        for (uint i = 1; i < ton_keys.length; i++) {
            if (
                staker_addrs[i] == staker_addr ||
                ton_keys[i] == ton_pubkey ||
                eth_addrs[i] == eth_addr
            ) {
                revert(ErrorCodes.DUPLICATE_RELAY);
            }
        }

        Node new_node = Node(0, 0);
        requests_nodes.push(new_node);
        ton_keys.push(ton_pubkey);
        eth_addrs.push(eth_addr);
        staker_addrs.push(staker_addr);
        staked_tokens.push(tokens);

        uint256 new_idx = requests_nodes.length - 1;

        // if there is no requests
        if (list_start_idx == 0) {
            list_start_idx = new_idx;
        // new request, add to sorted list
        } else {
            uint256 cur_node_idx = list_start_idx;

            while (cur_node_idx != 0) {
                if (tokens >= staked_tokens[cur_node_idx]) {
                    // current node is head
                    if (requests_nodes[cur_node_idx].prev_node == 0) {
                        requests_nodes[new_idx].next_node = cur_node_idx;
                        requests_nodes[cur_node_idx].prev_node = new_idx;
                        list_start_idx = new_idx;
                    // insert new node between cur and prev nodes
                    } else {
                        requests_nodes[new_idx].next_node = cur_node_idx;
                        requests_nodes[new_idx].prev_node = requests_nodes[cur_node_idx].prev_node;

                        requests_nodes[requests_nodes[cur_node_idx].prev_node].next_node = new_idx;
                        requests_nodes[cur_node_idx].prev_node = new_idx;
                    }

                    break;
                }

                // we reached end of list
                // it means this request has lowest tokens and should be added to tail
                if (requests_nodes[cur_node_idx].next_node == 0) {
                    requests_nodes[cur_node_idx].next_node = new_idx;
                    requests_nodes[new_idx].prev_node = cur_node_idx;
                    break;
                }

                cur_node_idx = requests_nodes[cur_node_idx].next_node;
            }
        }

        IUserData(msg.sender).relayMembershipRequestAccepted{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            round_num, tokens, ton_pubkey, eth_addr, lock_time
        );
    }

    // should be called after transfer of relay data to next relay round, controlled by staking
    function destroy() external override onlyRoot {
        // prevent accident call
        require (election_ended, ErrorCodes.ELECTION_ENDED);

        root.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function finish(uint32 code_version) external override onlyRoot {
        require (code_version == current_version, ErrorCodes.LOW_VERSION);

        tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 0);

        if (election_ended) {
            // send gas back to root
            root.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
            return;
        }

        election_ended = true;
        relay_transfer_start_idx = list_start_idx;
        IStakingPool(root).onElectionEnded{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            round_num, uint32(requests_nodes.length - 1)
        );
    }

    function sendRelaysToRelayRound(address relay_round_addr, uint32 relays_count) external override onlyRoot {
        require (election_ended, ErrorCodes.ELECTION_ENDED);

        tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 0);

        if (staked_tokens[relay_transfer_start_idx] == 0) {
            IRelayRound(relay_round_addr).setEmptyRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }();
            return;
        }

        (
            uint256[] _ton_keys_limit,
            uint160[] _eth_addrs_limit,
            address[] _staker_addrs_limit,
            uint128[] _staked_tokens_limit,
            uint256 new_start_idx
        ) = _getRequestsFromIdx(relays_count, relay_transfer_start_idx);
        relay_transfer_start_idx = new_start_idx;

        IRelayRound(relay_round_addr).setRelays{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            _ton_keys_limit, _eth_addrs_limit, _staker_addrs_limit, _staked_tokens_limit
        );
    }

    function upgrade(TvmCell code, uint32 new_version, address send_gas_to) external onlyRoot {
        if (new_version == current_version) {
            tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 0);
            send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
        } else {
            emit ElectionCodeUpgraded(new_version);

            TvmBuilder builder;
            uint8 _tmp;
            builder.store(root); // address 267
            builder.store(_tmp); // 8
            builder.store(send_gas_to); // address 267

            builder.store(platform_code); // ref1

            TvmBuilder initial;
            initial.store(round_num); // 32

            builder.storeRef(initial); // ref2

            TvmBuilder params;
            params.store(new_version); // 32
            params.store(current_version); // 32

            builder.storeRef(params); // ref3

            TvmBuilder data_builder;

            TvmBuilder data_builder_1;

            data_builder_1.store(requests_nodes); // 33 + ref1
            data_builder_1.store(list_start_idx); // 256
            data_builder_1.store(election_ended); // 1
            data_builder_1.store(relay_transfer_start_idx); // 256

            TvmBuilder data_builder_2;

            data_builder_2.store(ton_keys); // 33 + ref1
            data_builder_2.store(eth_addrs); // 33 + ref2
            data_builder_2.store(staker_addrs); // 33 + ref3
            data_builder_2.store(staked_tokens); // 33 + ref4

            data_builder.store(data_builder_1); // ref1
            data_builder.store(data_builder_2); // ref2

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
                    uint32 round_num
            3: params:
                bits:
                    uint32 new_version
                    uint32 current_version
            4: data
                refs:
                    1: data_1
                        bits:
                            uint256 list_start_idx
                            bool election_ended
                            uint256 relay_transfer_start_idx
                        refs:
                            1: requests_nodes
                    2: data_2
                        refs:
                            1: ton_keys
                            2: eth_addrs
                            3: staker_addrs
                            4: staked_tokens
    */

    function onCodeUpgrade(TvmCell upgrade_data) private {
        tvm.resetStorage();
        tvm.rawReserve(Gas.ELECTION_INITIAL_BALANCE, 0);

        TvmSlice s = upgrade_data.toSlice();
        (address root_, , address send_gas_to) = s.decode(address, uint8, address);
        root = root_;

        platform_code = s.loadRef();

        TvmSlice initialData = s.loadRefAsSlice();
        round_num = initialData.decode(uint32);

        TvmSlice params = s.loadRefAsSlice();
        (current_version, ) = params.decode(uint32, uint32);

        // create origin node after contract initialization
        requests_nodes.push(Node(0, 0));

        ton_keys.push(0);
        eth_addrs.push(0);
        staker_addrs.push(address.makeAddrNone());
        staked_tokens.push(0);

        IStakingPool(root).onElectionStarted{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(round_num);
    }

    function _buildUserDataParams(address user) private view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(user);
        return builder.toCell();
    }

    function _buildPlatformInitData(address platform_root, uint8 platform_type, TvmCell initial_data) private view returns (TvmCell) {
        return tvm.buildStateInit({
        contr: Platform,
        varInit: {
            root: platform_root,
            platformType: platform_type,
            initialData: initial_data,
            platformCode: platform_code
        },
        pubkey: 0,
        code: platform_code
        });
    }

    function getUserDataAddress(address user) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS }address(tvm.hash(_buildPlatformInitData(
            root,
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
