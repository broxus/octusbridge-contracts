pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../base/EverscaleBaseEvent.sol";
import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/IEverscaleEvent.sol";
import "../../../utils/cell-encoder/DaoCellEncoder.sol";
import "./../../../utils/ErrorCodes.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

/*
    @title DAO Ethereum Action event configuration
    @dev This implementation is used for executing DAO actions in EVM based networks
*/
contract DaoEthereumActionEvent is EverscaleBaseEvent, DaoCellEncoder {

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

    function getDecodedData() public view responsible returns (
        address gasBackAddress,
        uint32 chainId,
        ActionStructure.EthActionStripped[] actions
    ) {
        (
            int8 gasBackAddressWid,
            uint256 gasBackAddressValue,
            uint32 _chainId,
            ActionStructure.EthActionStripped[] _actions
        ) = decodeDaoEthereumActionData(eventInitData.voteData.eventData);

        gasBackAddress = address.makeAddrStd(gasBackAddressWid, gasBackAddressValue);

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (gasBackAddress, _chainId, _actions);
    }

    function gasBackAddress() internal override view returns(address) {
        (address gasBackAddress_,,) = getDecodedData();

        return gasBackAddress_;
    }
}
