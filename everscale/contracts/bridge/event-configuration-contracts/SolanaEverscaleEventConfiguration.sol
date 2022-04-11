pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


import './../interfaces/event-contracts/ISolanaEverscaleEvent.sol';
import "./../interfaces/event-configuration-contracts/ISolanaEverscaleEventConfiguration.sol";

import './../interfaces/ISolanaEverscaleProxy.sol';
import './../interfaces/ISolanaEverscaleProxyExtended.sol';

import './../event-contracts/base/SolanaEverscaleBaseEvent.sol';

import './../../utils/TransferUtils.sol';
import './../../utils/ErrorCodes.sol';

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Basic Solana event configuration contract.
/// @author https://github.com/broxus
contract SolanaEverscaleEventConfiguration is ISolanaEverscaleEventConfiguration, ISolanaEverscaleProxy, ISolanaEverscaleProxyExtended, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    SolanaEverscaleEventConfiguration public static networkConfiguration;

    TvmCell public meta;
    uint128 constant MIN_CONTRACT_BALANCE = 1 ton;

    /// @param _owner Event configuration owner
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

    /// @dev Set end block number. Can be set only in case current value is 0.
    /// @param endBlockNumber End block number
    function setEndBlockNumber(
        uint32 endBlockNumber
    )
        override
        onlyOwner
        external
    {
        require(
            networkConfiguration.endBlockNumber == 0,
            ErrorCodes.END_BLOCK_NUMBER_ALREADY_SET
        );

        require(
            endBlockNumber >= networkConfiguration.startBlockNumber,
            ErrorCodes.TOO_LOW_END_BLOCK_NUMBER
        );

        networkConfiguration.endBlockNumber = endBlockNumber;
    }

    /// @dev Build initial data for event contract
    /// @dev Extends event vote data with configuration params
    /// @param eventVoteData Event vote data structure, passed by relay
    function buildEventInitData(
        ISolanaEverscaleEvent.SolanaEverscaleEventVoteData eventVoteData
    ) internal view returns(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData
    ) {
        eventInitData.voteData = eventVoteData;

        eventInitData.configuration = address(this);
        eventInitData.staking = basicConfiguration.staking;
        eventInitData.chainId = networkConfiguration.chainId;
    }

    /// @dev Deploy event contract
    /// @param eventVoteData Event vote data
    function deployEvent(
        ISolanaEverscaleEvent.SolanaEverscaleEventVoteData eventVoteData
    )
        external
        override
        reserveMinBalance(MIN_CONTRACT_BALANCE)
    {
        require(msg.value >= basicConfiguration.eventInitialBalance, ErrorCodes.TOO_LOW_DEPLOY_VALUE);
        require(
            eventVoteData.eventBlockNumber >= networkConfiguration.startBlockNumber,
            ErrorCodes.EVENT_BLOCK_NUMBER_LESS_THAN_START
        );

        if (networkConfiguration.endBlockNumber != 0) {
            require(
                eventVoteData.eventBlockNumber <= networkConfiguration.endBlockNumber,
                ErrorCodes.EVENT_BLOCK_NUMBER_HIGHER_THAN_END
            );
        }

        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData = buildEventInitData(eventVoteData);

        address eventContract = deriveEventAddress(eventVoteData);

        emit NewEventContract(eventContract);

        new SolanaEverscaleBaseEvent{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            code: basicConfiguration.eventCode,
            pubkey: 0,
            varInit: {
                eventInitData: eventInitData
            }
        }(msg.sender, meta);
    }

    /// @dev Derive the Solana event contract address from it's init data
    /// @param eventVoteData Solana event vote data
    /// @return eventContract Address of the corresponding Solana event contract
    function deriveEventAddress(
        ISolanaEverscaleEvent.SolanaEverscaleEventVoteData eventVoteData
    )
        override
        public
        view
        responsible
    returns(
        address eventContract
    ) {
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData = buildEventInitData(eventVoteData);

        TvmCell stateInit = tvm.buildStateInit({
            contr: SolanaEverscaleBaseEvent,
            varInit: {
                eventInitData: eventInitData
            },
            pubkey: 0,
            code: basicConfiguration.eventCode
        });

        return {value: 0, flag: MsgFlag.REMAINING_GAS} address(tvm.hash(stateInit));
    }

    /**
        @dev Get configuration details.
        @return _basicConfiguration Basic configuration init data
        @return _networkConfiguration Network specific configuration init data
    */
    function getDetails() override public view responsible returns(
        BasicConfiguration _basicConfiguration,
        SolanaEverscaleEventConfiguration _networkConfiguration,
        TvmCell _meta
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            basicConfiguration,
            networkConfiguration,
            meta
        );
    }

    /// @dev Get event configuration type
    /// @return _type Configuration type - Solana or Everscale
    function getType() override public pure responsible returns(EventType _type) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} EventType.SolanaEverscale;
    }

    /// @dev Proxy V1 callback.
    /// Receives "confirm" callback from the event contract and checks event contract correctness.
    /// If it's correct, then sends the callback to the proxy with the same signature.
    /// @param eventInitData Solana event data
    /// @param gasBackAddress Gas back address
    function onEventConfirmed(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData,
        address gasBackAddress
    ) external override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(
            eventInitData.configuration == address(this),
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        address eventContract = _deriveEventAddress(eventInitData);

        require(
            eventContract == msg.sender,
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        ISolanaEverscaleProxy(networkConfiguration.proxy).onEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, gasBackAddress);

    }

    /// @dev Proxy V2 callback. Receives additional cell.
    /// Receives "confirm" callback from the event contract and checks event contract correctness.
    /// If it's correct, then sends the callback to the proxy with the same signature.
    /// @param eventInitData Solana event data
    /// @param _meta Arbitrary meta cell
    /// @param gasBackAddress Gas back address
    function onEventConfirmedExtended(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData,
        TvmCell _meta,
        address gasBackAddress
    ) external override reserveMinBalance(MIN_CONTRACT_BALANCE) {
        require(
            eventInitData.configuration == address(this),
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        address eventContract = _deriveEventAddress(eventInitData);

        require(
            eventContract == msg.sender,
            ErrorCodes.SENDER_NOT_EVENT_CONTRACT
        );

        ISolanaEverscaleProxyExtended(networkConfiguration.proxy).onEventConfirmedExtended{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, _meta, gasBackAddress);
    }

    function _deriveEventAddress(
        ISolanaEverscaleEvent.SolanaEverscaleEventInitData eventInitData
    ) internal view returns (address _event) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: SolanaEverscaleBaseEvent,
            varInit: {
                eventInitData: eventInitData
            },
            pubkey: 0,
            code: basicConfiguration.eventCode
        });

        _event = address(tvm.hash(stateInit));
    }
}
