pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;


import './../interfaces/IProxy.sol';
import './../interfaces/event-contracts/IEthereumEvent.sol';
import "./../../utils/TransferUtils.sol";

import "@broxus/contracts/contracts/utils/RandomNonce.sol";



/// @title Ethereum event proxy mockup contract.
/// Receives onEventConfirmed from ethereum event configuration when
/// ethereum event contract is executed.
/// For example it could be used for minting tokens in case of cross chain token transfers.
/// Or execute any other custom action.
contract ProxyMockup is IProxy, RandomNonce {
    address configuration;

    IEthereumEvent.EthereumEventInitData eventData;
    uint callbackCounter = 0;

    constructor(
        address _configuration
    ) public {
        tvm.accept();

        configuration = _configuration;
    }

    /*
        @dev Callback on executing ethereum event contract
        @dev Could be only called by the ethereum event contract
    */
    function onEventConfirmed(
        IEthereumEvent.EthereumEventInitData _eventData,
        address gasBackAddress
    ) override public {
        require(msg.sender == configuration);

        callbackCounter++;
        eventData = _eventData;

        if (gasBackAddress.value != 0) {
            gasBackAddress.transfer({ value: 0, flag: 64 });
        } else {
            msg.sender.transfer({ value: 0, flag: 64 });
        }
    }

    function getDetails() public view returns (
        IEthereumEvent.EthereumEventInitData _eventData,
        uint _callbackCounter
    ) {
        return (
            eventData,
            callbackCounter
        );
    }

    /*
        Decode event data according to some encoding.
        In this example used the same encoding as in the cross chain token-transfers
    */
    function getDecodedEventData() public view returns(
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey
    ) {
        (
            tokens,
            wid,
            owner_addr,
            owner_pubkey
        ) = eventData.voteData.eventData.toSlice().decode(uint128, int8, uint256, uint256);
    }
}
