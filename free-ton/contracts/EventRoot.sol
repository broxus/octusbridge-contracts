pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./TonToEthEvent.sol";

contract EventRoot is SimpleOwnable {

    address bridgeAddress;

    bytes ethAddress;
//  address proxyEventAddress;

    TvmCell tonToEthEventCode;
    TvmCell ethToTonEventCode;

    constructor(address _bridgeAddress,
                bytes _ethAddress,
//              address _proxyEventAddress,
                TvmCell _tonToEthEventCode,
                TvmCell _ethToTonEventCode
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;
        ethAddress = _ethAddress;
//      proxyEventAddress = _proxyEventAddress;
        tonToEthEventCode = _tonToEthEventCode;
        ethToTonEventCode = _ethToTonEventCode;
    }

    function processTonToEthSign(
        bytes payload,
        address signer,
        bytes sign,
        uint256 signedAt,
        uint8 minSigns
    ) external onlyOwner {
        //TODO: pubkey?
        TvmCell eventData = tvm.buildEmptyData(tvm.pubkey());
        TvmCell stateInit = tvm.buildStateInit(tonToEthEventCode, eventData);

        //TODO: value?
        //TODO: it not fail if already exists?
        address eventAddress = new TonToEthEvent{stateInit : stateInit, value : 1e9}(this, ethAddress, payload, minSigns);
        TonToEthEvent(eventAddress).saveSign(signer, sign, signedAt);

    }

    //TODO
    function processEthToTonSign() external onlyOwner {

    }
}
