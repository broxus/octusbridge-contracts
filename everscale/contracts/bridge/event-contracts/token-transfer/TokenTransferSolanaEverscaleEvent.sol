pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/ISolanaEverscaleEvent.sol";
import "./../../interfaces/ISolanaEverscaleProxy.sol";
import "./../../../utils/ErrorCodes.sol";

import "./../base/SolanaEverscaleBaseEvent.sol";
import "./../../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Solana Everscale event
/// @dev This implementation is used for cross chain token transfers
contract TokenTransferSolanaEverscaleEvent is SolanaEverscaleBaseEvent, ProxyTokenTransferCellEncoder {
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

    function onInit() override internal {
        notifyEventStatusChanged();

        loadRelays();
    }

    function onConfirm() override internal {
        notifyEventStatusChanged();

        ISolanaEverscaleProxy(eventInitData.configuration).onSolanaEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, initializer);
    }

    function onReject() override internal {
        notifyEventStatusChanged();
        transferAll(initializer);
    }

    function getOwner() private view returns(address) {
        (,,address ownerAddress) = getDecodedData();
        return ownerAddress;
    }

    /*
        @dev Get decoded event data
        @returns sender_addr Token sender address
        @returns tokens How much tokens to mint
        @returns receiver_addr Token receiver address
    */
    function getDecodedData() public view responsible returns (
        uint256 sender_addr,
        uint128 tokens,
        address receiver_addr
    ) {
        (
            sender_addr,
            tokens,
            receiver_addr
        ) = decodeSolanaEverscaleEventData(eventInitData.voteData.eventData);

        return {value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} (
            sender_addr,
            tokens,
            receiver_addr
        );
    }

    /// @dev Notify owner contract that event contract status has been changed
    /// @dev In this example, notification receiver is derived from the configuration meta
    /// @dev Used to easily collect all confirmed events by user's wallet
    function notifyEventStatusChanged() internal view {
        address owner = getOwner();

        if (owner.value != 0) {
            IEventNotificationReceiver(owner).notifyEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }
}
