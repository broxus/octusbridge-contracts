pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/IEthereumEvent.sol';
import "./../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";
import './../interfaces/IProxy.sol';

import './../utils/TransferUtils.sol';
import './../utils/ErrorCodes.sol';

import './../event-contracts/EthereumEvent.sol';

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/*
    @title Basic example of Ethereum event configuration
*/
contract EthereumEventConfiguration is IEthereumEventConfiguration, IProxy, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    EthereumEventConfiguration public static networkConfiguration;

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
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) internal view returns(
        IEthereumEvent.EthereumEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.meta = basicConfiguration.meta;
        eventInitData.staking = basicConfiguration.staking;
    }

    /*
        @notice Deploy event contract
        @param eventVoteData Event vote data
    */
    function deployEvent(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) external reserveBalance returns(address eventContract) {
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);

        IEthereumEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        // TODO: max value or exact?
        eventContract = new EthereumEvent{
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
        IEthereumEvent.EthereumEventVoteData eventVoteData
    )
        public
        view
    returns(
        address eventContract
    ) {
        IEthereumEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: EthereumEvent,
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
        @return networkConfiguration Network specific configuration init data
    */
    function getDetails() public view returns(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
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
    function getType() public pure returns(EventType _type) {
        return EventType.Ethereum;
    }

    /*
        @notice Update configuration data
        @dev Can be called only by owner
        @param _basicConfiguration New basic configuration init data
        @param networkConfiguration New network specific configuration init data
    */
    function update(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
    ) public onlyOwner {
        basicConfiguration = _basicConfiguration;
        networkConfiguration = _networkConfiguration;
    }

    /*
        @notice Receives execute callback from ethereum event
        and send it to the event proxy contract
        @dev Ethereum event correctness is checked here, so
        event proxy contract becomes more simple
        @param eventData Ethereum event data
        @param gasBackAddress Ad hoc param. Used in token transfers
        TODO: think about onBounce in case of paused event proxy
    */
    function broxusBridgeCallback(
        IEthereumEvent.EthereumEventInitData eventInitData,
        address gasBackAddress
    ) override external reserveBalance {
        require(
            eventInitData.configuration == address(this),
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        TvmCell stateInit = tvm.buildStateInit({
            contr: EthereumEvent,
            varInit: {
                eventInitData: eventInitData
            },
            pubkey: 0,
            code: basicConfiguration.eventCode
        });

        address eventContract = address(tvm.hash(stateInit));

        require(
            eventContract == msg.sender,
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        IProxy(networkConfiguration.proxy).broxusBridgeCallback{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, gasBackAddress);
    }
}
