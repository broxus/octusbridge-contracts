pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../base/EverscaleBaseEvent.sol";
import "./../../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/IEverscaleEvent.sol";
import "./../../../utils/ErrorCodes.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

/*
    @title Basic example of Everscale event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract TokenTransferEverscaleEvent is EverscaleBaseEvent, ProxyTokenTransferCellEncoder {
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

    function onInit() override internal {
        setStatusInitializing();

        notifyEventStatusChanged();

        loadRelays();
    }

    function onConfirm() override internal {
        notifyEventStatusChanged();
    }

    function onReject() override internal {
        notifyEventStatusChanged();
    }

    function getOwner() private view returns(address) {
        (,,,,address ownerAddress,) = getDecodedData();
        return ownerAddress;
    }

    function gasBackAddress() internal override view returns(address) {
        return getOwner();
    }

    /*
        @dev Get decoded event data
        @return rootToken Token root contract address
        @return wid Tokens sender address workchain ID
        @return addr Token sender address body
        @return tokens How much tokens to mint
        @return ethereum_address Token receiver Ethereum address
        @return owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view responsible returns (
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint160 ethereum_address,
        address owner_address,
        uint32 chainId
    ) {
        (
            wid,
            addr,
            tokens,
            ethereum_address,
            chainId
        ) = decodeEverscaleEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, addr);

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (
            wid,
            addr,
            tokens,
            ethereum_address,
            owner_address,
            chainId
        );
    }

    /*
        @dev Notify owner contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
        @dev Used to easily collect all confirmed events by user's wallet
    */
    function notifyEventStatusChanged() internal view {
        address owner = getOwner();

        if (owner.value != 0) {
            IEventNotificationReceiver(owner).notifyEventStatusChanged{flag: 0, bounce: false}(status());
        }
    }
}
