pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../base/EverscaleBaseEvent.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/IEverscaleEvent.sol";
import "../../../utils/ErrorCodes.sol";
import "../../../utils/cell-encoder/StakingCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';



contract StakingTonEvent is EverscaleBaseEvent, StakingCellEncoder {

    constructor(address _initializer, TvmCell _meta) EverscaleBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }
    
    function onInit() override internal {
        loadRelays();
    }

    function onConfirm() override internal {}

    function onReject() override internal {}

    function getDetails() public view responsible returns (
        EverscaleEventInitData _eventInitData,
        Status _status,
        uint[] _confirms,
        uint[] _rejects,
        uint[] empty,
        bytes[] _signatures,
        uint128 balance,
        address _initializer,
        TvmCell _meta,
        uint32 _requiredVotes
    ) {
        _confirms = getVoters(Vote.Confirm);

        for (uint voter : _confirms) {
            _signatures.push(signatures[voter]);
        }

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            eventInitData,
            status,
            _confirms,
            getVoters(Vote.Reject),
            getVoters(Vote.Empty),
            _signatures,
            address(this).balance,
            initializer,
            meta,
            requiredVotes
        );
    }

    function getDecodedData() public view responsible returns (uint128 round_num, uint160[] eth_keys, uint32 round_end) {
        (round_num, eth_keys, round_end) = decodeTonStakingEventData(eventInitData.voteData.eventData);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (round_num, eth_keys, round_end);
    }
}
