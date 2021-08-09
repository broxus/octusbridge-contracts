pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/IEthereumEvent.sol';
import "./../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";
import './../interfaces/IProxy.sol';

import './../event-contracts/EthereumEvent.sol';

import './../../utils/TransferUtils.sol';
import './../../utils/ErrorCodes.sol';

import './../../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import './../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Basic Ethereum event configuration contract.
/// @author https://github.com/pavlovdog
contract EthereumEventConfiguration is IEthereumEventConfiguration, IProxy, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    EthereumEventConfiguration public static networkConfiguration;

    /**
        @param _owner Event configuration owner
    */
    constructor(address _owner) public checkPubKey {
        tvm.accept();

        setOwnership(_owner);
    }

    /// @dev Build initial data for event contract
    /// @dev Extends event vote data with configuration params
    /// @param eventVoteData Event vote data structure, passed by relay
    function buildEventInitData(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    ) internal view returns(
        IEthereumEvent.EthereumEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.staking = basicConfiguration.staking;
        eventInitData.chainId = basicConfiguration.chainId;
    }

    /**
        @notice Deploy event contract
        @param eventVoteData Event vote data
    */
    function deployEvent(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    )
        external
        override
        reserveBalance
    returns(address eventContract) {
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);
        require(
            eventVoteData.eventBlockNumber >= networkConfiguration.startBlockNumber,
            ErrorCodes.EVENT_BLOCK_NUMBER_LESS_THAN_START
        );

        IEthereumEvent.EthereumEventInitData eventInitData = buildEventInitData(eventVoteData);

        eventContract = new EthereumEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: basicConfiguration.eventCode,
            pubkey: 0,
            varInit: {
                eventInitData: eventInitData
            }
        }(msg.sender, basicConfiguration.meta);
    }
    /**
        @notice Derive the Ethereum event contract address from it's init data
        @param eventVoteData Ethereum event vote data
        @return eventContract Address of the corresponding ethereum event contract
    */
    function deriveEventAddress(
        IEthereumEvent.EthereumEventVoteData eventVoteData
    )
        override
        public
        view
        responsible
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

        return {value: 0, flag: MsgFlag.REMAINING_GAS} address(tvm.hash(stateInit));
    }

    /**
        @notice Get configuration details.
        @return _basicConfiguration Basic configuration init data
        @return _networkConfiguration Network specific configuration init data
    */
    function getDetails() override public view responsible returns(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            basicConfiguration,
            networkConfiguration
        );
    }

    /// @notice Get event configuration type
    /// @return _type Configuration type - Ethereum or TON
    function getType() override public pure responsible returns(EventType _type) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} EventType.Ethereum;
    }

    /// @dev Update configuration data
    /// @param _basicConfiguration New basic configuration init data
    /// @param _networkConfiguration New network specific configuration init data
    function update(
        BasicConfiguration _basicConfiguration,
        EthereumEventConfiguration _networkConfiguration
    ) override public onlyOwner {
        basicConfiguration = _basicConfiguration;
        networkConfiguration = _networkConfiguration;
    }

    /// @dev Receives execute callback from ethereum event and send it to the event proxy contract.
    /// Ethereum event correctness is checked here, so event proxy contract becomes more simple
    /// @param eventInitData Ethereum event data
    /// @param gasBackAddress Ad hoc param. Used in token transfers
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
