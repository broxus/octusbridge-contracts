pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../../interfaces/IEventNotificationReceiver.sol";
import "./../../interfaces/event-contracts/IEthereumEvent.sol";
import "./../../interfaces/IProxy.sol";
import "./../../../utils/ErrorCodes.sol";

import "./../base/EthereumBaseEvent.sol";
import "./../../../utils/cell-encoder/ProxyTokenTransferCellEncoder.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


/// @title Basic example of Ethereum event configuration
/// @dev Anyone can deploy it for specific event. Relays send their
/// rejects / confirms with external message directly into this contract.
/// In case enough confirmations is collected - callback is executed.
/// This implementation is used for cross chain token transfers
contract TokenTransferEthereumEvent is EthereumBaseEvent, ProxyTokenTransferCellEncoder {
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

    function onInit() override internal {
        setStatusInitializing();

        notifyEventStatusChanged();

        loadRelays();
    }

    function onConfirm() override internal {
        notifyEventStatusChanged();

        IProxy(eventInitData.configuration).onEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, initializer);
    }

    function onReject() override internal {
        notifyEventStatusChanged();
        transferAll(initializer);
    }

    function getOwner() private view returns(address) {
        (,,,address ownerAddress) = getDecodedData();
        return ownerAddress;
    }

    /*
        @dev Get decoded event data
        @return tokens How much tokens to mint
        @return wid Tokens receiver address workchain ID
        @return owner_addr Token receiver address body
        @return owner_pubkey Token receiver public key
        @return owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view responsible returns (
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        address owner_address
    ) {
        (
            tokens,
            wid,
            owner_addr
        ) = decodeEthereumEventData(eventInitData.voteData.eventData);

        owner_address = address.makeAddrStd(wid, owner_addr);

        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (
            tokens,
            wid,
            owner_addr,
            owner_address
        );
    }

    /// @dev Notify owner contract that event contract status has been changed
    /// @dev In this example, notification receiver is derived from the configuration meta
    /// @dev Used to easily collect all confirmed events by user's wallet
    function notifyEventStatusChanged() internal view {
        address owner = getOwner();

        if (owner.value != 0) {
            IEventNotificationReceiver(owner).notifyEventStatusChanged{flag: 0, bounce: false}(status());
        }
    }
}
