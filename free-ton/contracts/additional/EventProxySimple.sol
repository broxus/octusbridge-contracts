pragma solidity >= 0.6.0;
pragma AbiHeader expire;


import './../interfaces/IProxy.sol';
import './../interfaces/IEvent.sol';
import './../event-contracts/EthereumEvent.sol';
import "./../utils/TransferUtils.sol";


contract EventProxySimple is IProxy, TransferUtils {
    uint16 static _randomNonce;

    bool callbackReceived = false;

    address ethereumEventConfiguration;
    TvmCell ethereumEventCode;
    uint ethereumEventPubKey;
    uint state;

    IEvent.EthereumEventInitData eventData;

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

        return tvm.deploy(stateInit, stateInit, 0, 0);
    }

    function broxusBridgeCallback(
        IEvent.EthereumEventInitData _eventData,
        address gasBackAddress
    ) override public {
        require(_eventData.ethereumEventConfiguration == ethereumEventConfiguration, 19173);
        require(_eventData.proxyAddress == address(this), 19172);
        require(buildEventProxyAddress(_eventData) == msg.sender, 19171);

        callbackReceived = true;
        eventData = _eventData;
        (state) = _eventData.eventData.toSlice().decode((uint));

        if (gasBackAddress.value != 0) {
            gasBackAddress.transfer({ value: 0, flag: 64 });
        } else {
            msg.sender.transfer({ value: 0, flag: 64 });
        }
    }

    function broxusBridgeNotification(
        IEvent.EthereumEventInitData _eventData
    ) override public view {
        // Do nothing need for handy monitoring confirmed events
        // So someone can call them after with any gas
    }

    function getDetails() public view returns (
        bool _callbackReceived,
        address _ethereumEventConfiguration,
        TvmCell _ethereumEventCode,
        IEvent.EthereumEventInitData _eventData,
        uint _state
    ) {
        return (
            callbackReceived,
            ethereumEventConfiguration,
            ethereumEventCode,
            eventData,
            state
        );
    }
}
