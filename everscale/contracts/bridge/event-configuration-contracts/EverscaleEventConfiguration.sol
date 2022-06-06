pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/IEverscaleEvent.sol';
import "./../interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";

import './../event-contracts/base/EverscaleBaseEvent.sol';

import './../../utils/TransferUtils.sol';
import './../../utils/ErrorCodes.sol';

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of Everscale event configuration
*/
contract EverscaleEventConfiguration is IEverscaleEventConfiguration, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    EverscaleEventConfiguration public static networkConfiguration;

    TvmCell public meta;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    /*
        @param _owner Event configuration owner
    */
    constructor(address _owner, TvmCell _meta) public checkPubKey {
        tvm.accept();

        tvm.rawReserve(MIN_CONTRACT_BALANCE, 0);

        setOwnership(_owner);

        meta = _meta;

        _owner.transfer({
            value: 0,
            bounce: false,
            flag: MsgFlag.ALL_NOT_RESERVED
        });
    }

    /**
        @notice
            Set new configuration meta.
        @param _meta New configuration meta
    */
    function setMeta(TvmCell _meta) override onlyOwner cashBack external {
        meta = _meta;
    }

    /// @dev Set end timestamp. Can be set only in case current value is 0.
    /// @param endTimestamp End timestamp.
    function setEndTimestamp(
        uint32 endTimestamp
    )
        override
        public
        onlyOwner
    {
        require(
            networkConfiguration.endTimestamp == 0,
            ErrorCodes.END_TIMESTAMP_ALREADY_SET
        );

        require(
            endTimestamp >= networkConfiguration.startTimestamp,
            ErrorCodes.TOO_LOW_END_TIMESTAMP
        );

        networkConfiguration.endTimestamp = endTimestamp;
    }

    /// @dev Build initial data for event contract.
    /// Extends event vote data with configuration params.
    /// @param eventVoteData Event vote data structure, passed by relay
    function buildEventInitData(
        IEverscaleEvent.EverscaleEventVoteData eventVoteData
    ) internal view returns(
        IEverscaleEvent.EverscaleEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.staking = basicConfiguration.staking;
    }

    /// @dev Deploy event contract
    /// @param eventVoteData Event vote data
    function deployEvent(
        IEverscaleEvent.EverscaleEventVoteData eventVoteData
    )
        override
        external
        reserveAtLeastTargetBalance()
    {
        require(msg.sender == networkConfiguration.eventEmitter, ErrorCodes.SENDER_IS_NOT_EVENT_EMITTER);
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);
        require(
            eventVoteData.eventTimestamp >= networkConfiguration.startTimestamp,
            ErrorCodes.EVENT_TIMESTAMP_LESS_THAN_START
        );

        if (networkConfiguration.endTimestamp != 0) {
            require(
                eventVoteData.eventTimestamp <= networkConfiguration.endTimestamp,
                ErrorCodes.EVENT_TIMESTAMP_HIGHER_THAN_END
            );
        }


        IEverscaleEvent.EverscaleEventInitData eventInitData = buildEventInitData(eventVoteData);

        address eventContract = deriveEventAddress(eventVoteData);

        emit NewEventContract(eventContract);

        new EverscaleBaseEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: basicConfiguration.eventCode,
            pubkey: 0,
            varInit: {
                eventInitData: eventInitData
            }
        }(msg.sender, meta);
    }

    /*
        @dev Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @return eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        IEverscaleEvent.EverscaleEventVoteData eventVoteData
    )
        override
        public
        view
        responsible
    returns (
        address eventContract
    ) {
        IEverscaleEvent.EverscaleEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: EverscaleBaseEvent,
            varInit: {
                eventInitData: eventInitData
            },
            pubkey: 0,
            code: basicConfiguration.eventCode
        });

        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} address(tvm.hash(stateInit));
    }

    /*
        @dev Get configuration details.
        @return _basicConfiguration Basic configuration init data
        @return _initData Network specific configuration init data
    */
    function getDetails() override public view responsible returns(
        BasicConfiguration _basicConfiguration,
        EverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false}(
            basicConfiguration,
            networkConfiguration,
            meta
        );
    }


    /*
        @dev Get event configuration type
        @return _type Configuration type - Ethereum or Everscale
    */
    function getType() override public pure responsible returns(EventType _type) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} EventType.Everscale;
    }
}
