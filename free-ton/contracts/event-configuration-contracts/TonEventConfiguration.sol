pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/ITonEvent.sol';
import "./../interfaces/event-configuration-contracts/ITonEventConfiguration.sol";

import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';

import './../event-contracts/TonEvent.sol';

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


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

    /*
        @notice Build initial data for event contract
        @dev Extends event vote data with configuration params
        @param eventVoteData Event vote data structure, passed by relay
    */
    function buildEventInitData(
        ITonEvent.TonEventVoteData eventVoteData
    ) internal view returns(
        ITonEvent.TonEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.meta = basicConfiguration.meta;
        eventInitData.staking = basicConfiguration.staking;
    }

    // TODO: add interfaces
    // TODO: add basic contracts for configurations and events
    /*
        @notice Deploy event contract
        @param eventVoteData Event vote data
    */
    function deployEvent(
        ITonEvent.TonEventVoteData eventVoteData
    ) override external reserveBalance returns(address eventEmitter) {
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);

        ITonEvent.TonEventInitData eventInitData = buildEventInitData(eventVoteData);

        eventEmitter = new TonEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: basicConfiguration.eventCode,
            pubkey: 0,
            varInit: {
                eventInitData: eventInitData
            }
        }(msg.sender);
    }

    /*
        @notice Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @returns eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        ITonEvent.TonEventVoteData eventVoteData
    )
        override
        public
        view
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

        return address(tvm.hash(stateInit));
    }

    /*
        @notice Get configuration details.
        @return _basicConfiguration Basic configuration init data
        @return _initData Network specific configuration init data
    */
    function getDetails() override public view returns(
        BasicConfiguration _basicConfiguration,
        TonEventConfiguration _networkConfiguration
    ) {
        return (
            basicConfiguration,
            networkConfiguration
        );
    }


    /*
        @notice Get event configuration type
        @return _type Configuration type - Ethereum or TON
    */
    function getType() override public pure returns(EventType _type) {
        return EventType.TON;
    }


    /*
        @notice Update configuration data
        @dev Can be called only by owner
        @param _basicConfiguration New basic configuration init data
        @param _networkConfiguration New network specific configuration init data
    */
    function update(
        BasicConfiguration _basicConfiguration,
        TonEventConfiguration _networkConfiguration
    ) override public cashBack onlyOwner {
        basicConfiguration = _basicConfiguration;
        networkConfiguration = _networkConfiguration;
    }
}
