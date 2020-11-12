pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./TonToEthEvent.sol";

contract TonToEthEventRoot is SimpleOwnable {

    bytes ethAddress;
    uint8 minSigns;

    TvmCell tonToEthEventCode;

    constructor(bytes _ethAddress,
                uint8 _minSigns,
                TvmCell _tonToEthEventCode
    ) public {
        tvm.accept();

        ethAddress = _ethAddress;
        minSigns = _minSigns;
        tonToEthEventCode = _tonToEthEventCode;
    }

    function processSign(
        bytes payload,
        address signer,
        bytes sign,
        uint256 signedAt
    ) external onlyOwner {
        //TODO: pubkey?
        TvmCell eventData = tvm.buildEmptyData(tvm.pubkey());
        TvmCell stateInit = tvm.buildStateInit(tonToEthEventCode, eventData);

        //TODO: value?
        //TODO: it not fail if already exists?
        address eventAddress = new TonToEthEvent{stateInit : stateInit, value : 1e9}(this, ethAddress, payload, minSigns);
        TonToEthEvent(eventAddress).saveSign(signer, sign, signedAt);

    }
}
