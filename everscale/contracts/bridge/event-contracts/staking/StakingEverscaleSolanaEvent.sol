pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../base/EverscaleSolanaBaseEvent.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/IEverscaleSolanaEvent.sol";
import "../../../utils/ErrorCodes.sol";
import "../../../utils/cell-encoder/StakingCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';



contract StakingEverscaleSolanaEvent is EverscaleSolanaBaseEvent, StakingCellEncoder {

    constructor(
        address _initializer,
        TvmCell _meta
    ) EverscaleSolanaBaseEvent(_initializer, _meta) public {}

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

    function getDecodedData() public view responsible returns (uint128 round_num, uint256[] sol_keys, uint32 round_end) {
        (round_num, sol_keys, round_end) = decodeEverscaleSolanaStakingEventData(eventInitData.voteData.eventData);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (round_num, sol_keys, round_end);
    }
}
