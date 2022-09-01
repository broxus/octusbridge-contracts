pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../base/SolanaEverscaleBaseEvent.sol";
import "../../interfaces/IEventNotificationReceiver.sol";
import "../../interfaces/event-contracts/ISolanaEverscaleEvent.sol";
import "../../interfaces/ISolanaEverscaleProxy.sol";
import "../../../utils/ErrorCodes.sol";
import "../../../utils/cell-encoder/StakingCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';



contract StakingSolanaEverscaleEvent is SolanaEverscaleBaseEvent, StakingCellEncoder {

    constructor(
        address _initializer,
        TvmCell _meta
    ) SolanaEverscaleBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function onConfirm() override internal {
        ISolanaEverscaleProxy(eventInitData.configuration).onSolanaEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, initializer);
    }

    function onReject() override internal {
        transferAll(initializer);
    }

    function getDecodedData() public view responsible returns (
        uint256 sol_addr,
        int8 wk_id,
        uint256 ever_addr_body,
        address ever_staker_addr
    ) {
        (sol_addr, wk_id, ever_addr_body) = decodeSolanaEverscaleStakingEventData(eventInitData.voteData.eventData);

        ever_staker_addr = address.makeAddrStd(wk_id, ever_addr_body);

        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (sol_addr, wk_id, ever_addr_body, ever_staker_addr);
    }
}
