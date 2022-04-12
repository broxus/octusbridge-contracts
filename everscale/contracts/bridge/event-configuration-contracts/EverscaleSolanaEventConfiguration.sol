pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/IEverscaleSolanaEvent.sol';
import "./../interfaces/event-configuration-contracts/IEverscaleSolanaEventConfiguration.sol";

import './../event-contracts/base/EverscaleSolanaBaseEvent.sol';

import './../../utils/TransferUtils.sol';
import './../../utils/ErrorCodes.sol';

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of Everscale event configuration
*/
contract EverscaleSolanaEventConfiguration is IEverscaleSolanaEventConfiguration, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    EverscaleSolanaEventConfiguration public static networkConfiguration;

    TvmCell public meta;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    /*
        @param _owner Event configuration owner
    */
    constructor(address _owner, TvmCell _meta) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);

        meta = _meta;
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
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    ) internal view returns(
        IEverscaleSolanaEvent.EverscaleSolanaEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.staking = basicConfiguration.staking;
    }

    /// @dev Deploy event contract
    /// @param eventVoteData Event vote data
    function deployEvent(
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    ) override external reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(msg.sender == networkConfiguration.eventEmitter, ErrorCodes.SENDER_IS_NOT_EVENT_EMITTER);
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);

        IEverscaleSolanaEvent.EverscaleSolanaEventInitData eventInitData = buildEventInitData(eventVoteData);

        address eventContract = deriveEventAddress(eventVoteData);

        emit NewEventContract(eventContract);

        new EverscaleSolanaBaseEvent{
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
        @dev Derive the Solana event contract address from it's init data
        @param eventVoteData Solana event vote data
        @returns eventContract Address of the corresponding Solana event contract
    */
    function deriveEventAddress(
        IEverscaleSolanaEvent.EverscaleSolanaEventVoteData eventVoteData
    )
        override
        public
        view
        responsible
    returns (
        address eventContract
    ) {
        IEverscaleSolanaEvent.EverscaleSolanaEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: EverscaleSolanaBaseEvent,
            varInit: {
                eventInitData: eventInitData
            },
            pubkey: 0,
            code: basicConfiguration.eventCode
        });

        return {value: 0, flag: MsgFlag.REMAINING_GAS} address(tvm.hash(stateInit));
    }

    /*
        @dev Get configuration details.
        @return _basicConfiguration Basic configuration init data
        @return _initData Network specific configuration init data
    */
    function getDetails() override public view responsible returns(
        BasicConfiguration _basicConfiguration,
        EverscaleSolanaEventConfiguration _networkConfiguration,
        TvmCell _meta
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            basicConfiguration,
            networkConfiguration,
            meta
        );
    }


    /*
        @dev Get event configuration type
        @return _type Configuration type - Solana or Everscale
    */
    function getType() override public pure responsible returns(EventType _type) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} EventType.EverscaleSolana;
    }
}
