pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../base/EthereumBaseEvent.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/IEthereumEvent.sol";
import "../../interfaces/IProxy.sol";
import "../../../utils/ErrorCodes.sol";
import "../../../utils/cell-encoder/StakingCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';



contract StakingEthEvent is EthereumBaseEvent, StakingCellEncoder {

    constructor(address _initializer, TvmCell _meta) EthereumBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function onInit() override internal {}

    function onConfirm() override internal {
        IProxy(eventInitData.configuration).onEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, initializer);
    }

    function onReject() override internal {
        transferAll(initializer);
    }


    /// @dev Get event details
    /// @return _eventInitData Init data
    /// @return _status Current event status
    /// @return _confirms List of relays who have confirmed event
    /// @return _rejects List of relays who have rejected event
    /// @return empty List of relays who have not voted
    /// @return balance This contract's balance
    /// @return _initializer Account who has deployed this contract
    /// @return _meta Meta data from the corresponding event configuration
    /// @return _requiredVotes The required amount of votes to confirm / reject event.
    /// Basically it's 2/3 + 1 relays for this round
    function getDetails() public view responsible returns (
        EthereumEventInitData _eventInitData,
        Status _status,
        uint[] _confirms,
        uint[] _rejects,
        uint[] empty,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status,
            getVoters(Vote.Confirm),
            getVoters(Vote.Reject),
            getVoters(Vote.Empty),
            address(this).balance,
            initializer,
            meta,
            requiredVotes
        );
    }


    function getDecodedData() public view responsible returns (
        uint160 eth_addr,
        int8 wk_id,
        uint256 ton_addr_body,
        address ton_staker_addr
    ) {
        (eth_addr, wk_id, ton_addr_body) = decodeEthereumStakingEventData(eventInitData.voteData.eventData);

        ton_staker_addr = address.makeAddrStd(wk_id, ton_addr_body);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (eth_addr, wk_id, ton_addr_body, ton_staker_addr);
    }
}
