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

    constructor(
        address _initializer,
        TvmCell _meta
    ) EverscaleBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function onConfirm() override internal {}

    function onReject() override internal {}

    function getDecodedData() public view responsible returns (uint128 round_num, uint160[] eth_keys, uint32 round_end) {
        (round_num, eth_keys, round_end) = decodeTonStakingEventData(eventInitData.voteData.eventData);

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (round_num, eth_keys, round_end);
    }
}
