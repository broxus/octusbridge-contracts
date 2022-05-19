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

    constructor(
        address _initializer,
        TvmCell _meta
    ) EthereumBaseEvent(_initializer, _meta) public {}

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
        IProxy(eventInitData.configuration).onEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, initializer);
    }

    function onReject() override internal {
        transferAll(initializer);
    }

    function getDecodedData() public view responsible returns (
        uint160 eth_addr,
        int8 wk_id,
        uint256 ton_addr_body,
        address ton_staker_addr
    ) {
        (eth_addr, wk_id, ton_addr_body) = decodeEthereumStakingEventData(eventInitData.voteData.eventData);

        ton_staker_addr = address.makeAddrStd(wk_id, ton_addr_body);

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (eth_addr, wk_id, ton_addr_body, ton_staker_addr);
    }
}
