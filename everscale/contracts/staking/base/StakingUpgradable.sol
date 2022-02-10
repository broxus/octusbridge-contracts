pragma ton-solidity >= 0.57.0;
pragma AbiHeader pubkey;


import "./StakingBase.sol";


abstract contract StakingPoolUpgradable is StakingPoolBase {
    function installPlatformOnce(TvmCell code, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        // can be installed only once
        require(!code_data.has_platform_code, ErrorCodes.PLATFORM_CODE_NON_EMPTY);
        tvm.rawReserve(_reserve(), 0);
        code_data.platform_code = code;
        code_data.has_platform_code = true;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateUserDataCode(TvmCell code, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        code_data.user_data_code = code;
        code_data.user_data_version++;
        emit UserDataCodeUpgraded(code_data.user_data_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateElectionCode(TvmCell code, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        code_data.election_code = code;
        code_data.election_version++;
        emit ElectionCodeUpgraded(code_data.election_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateRelayRoundCode(TvmCell code, address send_gas_to) external onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);
        code_data.relay_round_code = code;
        code_data.relay_round_version++;
        emit RelayRoundCodeUpgraded(code_data.relay_round_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    // user should call this by himself
    function upgradeUserData(address send_gas_to) external view onlyActive {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        _upgradeUserData(msg.sender, 0, send_gas_to);
    }

    function forceUpgradeUserData(
        address user,
        address send_gas_to
    ) external view onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        _upgradeUserData(user, 0, send_gas_to);
    }

    function _upgradeUserData(address user, uint128 gas_value, address send_gas_to) internal view {
        emit RequestedUserDataUpgrade(user);
        address user_data = getUserDataAddress(user);
        uint16 flag = 0;
        if (gas_value == 0) {
            flag = MsgFlag.ALL_NOT_RESERVED;
        }
        IUpgradableByRequest(user_data).upgrade{ value: gas_value, flag: flag }(
            code_data.user_data_code,
            code_data.user_data_version,
            send_gas_to
        );
    }

    function upgradeElection(
        uint32 round_num,
        address send_gas_to
    ) external view onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        emit RequestedElectionUpgrade(round_num);
        IUpgradableByRequest(getElectionAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            code_data.election_code, code_data.election_version, send_gas_to
        );
    }

    function upgradeRelayRound(
        uint32 round_num,
        address send_gas_to
    ) external view onlyAdmin {
        require (msg.value >= Gas.MIN_CALL_MSG_VALUE, ErrorCodes.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 0);

        emit RequestedRelayRoundUpgrade(round_num);
        IUpgradableByRequest(getRelayRoundAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            code_data.relay_round_code, code_data.relay_round_version, send_gas_to
        );
    }

    function _buildElectionParams(uint32 round_num) internal inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint32 round_num) internal inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function getElectionAddress(uint32 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.Election,
            _buildElectionParams(round_num)
        )));
    }

    function getRelayRoundAddress(uint32 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        )));
    }

    // will fall if called with on origin round with time < origin round start time (which is impossible anyway)
    function getRelayRoundAddressFromTimestamp(uint32 time) public view responsible returns (address, uint32) {
        uint32 round_num = time < round_details.currentRelayRoundStartTime ? round_details.currentRelayRound - 1 : round_details.currentRelayRound;
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } (getRelayRoundAddress(round_num), round_num);
    }
}
