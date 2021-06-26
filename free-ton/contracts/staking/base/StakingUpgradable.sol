pragma ton-solidity ^0.39.0;


import "./StakingBase.sol";


abstract contract StakingPoolUpgradable is StakingPoolBase {
    function installPlatformOnce(TvmCell code, address send_gas_to) external onlyOwner {
        // can be installed only once
        require(!has_platform_code, StakingErrors.PLATFORM_CODE_NON_EMPTY);
        tvm.rawReserve(_reserve(), 2);
        platform_code = code;
        has_platform_code = true;
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateUserDataCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        user_data_code = code;
        user_data_version++;
        emit UserDataCodeUpgraded(user_data_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateElectionCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        election_code = code;
        election_version++;
        emit ElectionCodeUpgraded(election_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function installOrUpdateRelayRoundCode(TvmCell code, address send_gas_to) external onlyOwner {
        tvm.rawReserve(_reserve(), 2);
        relay_round_code = code;
        relay_round_version++;
        emit RelayRoundCodeUpgraded(relay_round_version);
        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
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
    function upgradeUserData(address send_gas_to) external view onlyActive {
        require(msg.value >= Gas.UPGRADE_USER_DATA_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedUserDataUpgrade(msg.sender);
        address user_data = getUserDataAddress(msg.sender);
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

        emit RequestedUserDataUpgrade(user);
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
        IUpgradableByRequest(getElectionAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            election_code, election_version, send_gas_to
        );
    }

    function upgradeRelayRound(
        uint128 round_num,
        address send_gas_to
    ) external view onlyOwner {
        require(msg.value >= Gas.UPGRADE_RELAY_ROUND_MIN_VALUE, StakingErrors.VALUE_TOO_LOW);
        tvm.rawReserve(_reserve(), 2);

        emit RequestedRelayRoundUpgrade(round_num);
        IUpgradableByRequest(getRelayRoundAddress(round_num)).upgrade{ value: 0, flag: MsgFlag.ALL_NOT_RESERVED }(
            relay_round_code, relay_round_version, send_gas_to
        );
    }

    function _buildElectionParams(uint128 round_num) internal inline view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(round_num);
        return builder.toCell();
    }

    function _buildRelayRoundParams(uint128 round_num) internal inline view returns (TvmCell) {
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

    function getRelayRoundAddress(uint128 round_num) public view responsible returns (address) {
        return { value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS } address(tvm.hash(_buildInitData(
            PlatformTypes.RelayRound,
            _buildRelayRoundParams(round_num)
        )));
    }

    // TODO: add ugprade and onUpgrade
}
