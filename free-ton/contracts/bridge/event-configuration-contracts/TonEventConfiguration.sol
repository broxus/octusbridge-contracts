pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/ITonEvent.sol';
import "./../interfaces/event-configuration-contracts/ITonEventConfiguration.sol";

import './../event-contracts/TonEvent.sol';

import './../../utils/TransferUtils.sol';
import './../../utils/ErrorCodes.sol';

import './../../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of TON event configuration
*/
contract TonEventConfiguration is ITonEventConfiguration, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    TonEventConfiguration public static networkConfiguration;

    /*
        @param _owner Event configuration owner
    */
    constructor(address _owner) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);
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
        ITonEvent.TonEventVoteData eventVoteData
    ) internal view returns(
        ITonEvent.TonEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.staking = basicConfiguration.staking;
        eventInitData.chainId = basicConfiguration.chainId;
    }

    /// @dev Deploy event contract
    /// @param eventVoteData Event vote data
    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) override external reserveBalance returns(address eventContract) {
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


        ITonEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        eventContract = new TonEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: basicConfiguration.eventCode,
            pubkey: 0,
            varInit: {
                eventInitData: eventInitData
            }
        }(msg.sender, basicConfiguration.meta);
    }

    /*
        @dev Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @returns eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        ITonEvent.TonEventVoteData eventVoteData
    )
        override
        public
        view
        responsible
    returns (
        address eventContract
    ) {
        ITonEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: TonEvent,
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
        TonEventConfiguration _networkConfiguration
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            basicConfiguration,
            networkConfiguration
        );
    }


    /*
        @dev Get event configuration type
        @return _type Configuration type - Ethereum or TON
    */
    function getType() override public pure responsible returns(EventType _type) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} EventType.TON;
    }
}
