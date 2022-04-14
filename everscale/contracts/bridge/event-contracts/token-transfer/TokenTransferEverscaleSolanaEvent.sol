pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../base/EverscaleSolanaBaseEvent.sol";
import "./../../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/IEverscaleSolanaEvent.sol";
import "./../../../utils/ErrorCodes.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

/*
    @title Everscale Solana event
    @dev This implementation is used for cross chain token transfers
*/
contract TokenTransferEverscaleSolanaEvent is EverscaleSolanaBaseEvent, ProxyTokenTransferCellEncoder {
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

    function close() public view {
        require(status != Status.Pending || now > createdAt + FORCE_CLOSE_TIMEOUT, ErrorCodes.EVENT_PENDING);
        address ownerAddress = getOwner();

        require(msg.sender == ownerAddress, ErrorCodes.SENDER_IS_NOT_EVENT_OWNER);
        transferAll(ownerAddress);
    }

    function onInit() override internal {
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
        (,,,,address ownerAddress) = getDecodedData();
        return ownerAddress;
    }

    /*
        @dev Get decoded event data
        @returns rootToken Token root contract address
        @returns wid Tokens sender address workchain ID
        @returns addr Token sender address body
        @returns tokens How much tokens to mint
        @returns solana_address Token receiver solana address
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view responsible returns (
        int8 wid,
        uint256 addr,
        uint128 tokens,
        uint256 solana_address,
        address owner_address
    ) {
        (
            wid,
            addr,
            tokens,
            solana_address
        ) = decodeEverscaleSolanaEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, addr);

        return {value: 0, flag: MsgFlag.REMAINING_GAS} (
            wid,
            addr,
            tokens,
            solana_address,
            owner_address
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
            IEventNotificationReceiver(owner).notifyEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }
}
