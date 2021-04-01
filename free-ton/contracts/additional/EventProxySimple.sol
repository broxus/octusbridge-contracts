pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import './../interfaces/IProxy.sol';
import './../interfaces/IEvent.sol';
import './../event-contracts/EthereumEvent.sol';
import "./../utils/TransferUtils.sol";


contract EventProxySimple is IProxy, TransferUtils {
    uint16 static _randomNonce;

    address ethereumEventConfiguration;
    TvmCell ethereumEventCode;
    uint ethereumEventPubKey;

    IEvent.EthereumEventInitData eventData;
    uint callbackCounter = 0;

    constructor(
        address _ethereumEventConfiguration,
        TvmCell _ethereumEventCode,
        uint _ethereumEventPubKey
    ) public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        ethereumEventConfiguration = _ethereumEventConfiguration;
        ethereumEventCode = _ethereumEventCode;
        ethereumEventPubKey = _ethereumEventPubKey;
    }

    function buildEventProxyAddress(
        IEvent.EthereumEventInitData _eventData
    ) public view returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            code: ethereumEventCode,
            pubkey: ethereumEventPubKey,
            varInit: {
                initData: _eventData
            },
            contr: EthereumEvent
        });

        return address(tvm.hash(stateInit));
    }

    function broxusBridgeCallback(
        IEvent.EthereumEventInitData _eventData,
        address gasBackAddress
    ) override public {
        require(_eventData.ethereumEventConfiguration == ethereumEventConfiguration, 19173);
        require(_eventData.proxyAddress == address(this), 19172);
        require(buildEventProxyAddress(_eventData) == msg.sender, 19171);

        callbackCounter++;
        eventData = _eventData;

        if (gasBackAddress.value != 0) {
            gasBackAddress.transfer({ value: 0, flag: 64 });
        } else {
            msg.sender.transfer({ value: 0, flag: 64 });
        }
    }

    function getDetails() public view returns (
        address _ethereumEventConfiguration,
        TvmCell _ethereumEventCode,
        IEvent.EthereumEventInitData _eventData,
        uint _callbackCounter
    ) {
        return (
            ethereumEventConfiguration,
            ethereumEventCode,
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
        ) = eventData.eventData.toSlice().decode(uint128, int8, uint256, uint256);
    }
}
