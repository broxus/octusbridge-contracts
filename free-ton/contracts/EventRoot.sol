pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./TonToEthEvent.sol";

contract EventRoot is SimpleOwnable {

    address bridgeAddress;

    bytes ethAddress;
    address proxyEventAddress;
    TvmCell tonToEthEventCode;
    TvmCell ethToTonEventCode;

    constructor(address _bridgeAddress,
                bytes _ethAddress,
                address _proxyEventAddress,
                TvmCell _tonToEthEventCode,
                TvmCell _ethToTonEventCode
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;
        ethAddress = _ethAddress;
        proxyEventAddress = _proxyEventAddress;
        tonToEthEventCode = _tonToEthEventCode;
        ethToTonEventCode = _ethToTonEventCode;
    }

    function processTonToEthSign(
        address signer,
        bytes payload,
        bytes ethPublicKey,
        bytes sign,
        uint256 signedAt,
        uint8 minSigns
    ) external onlyOwner {

        //TODO: how to calculate address?
        address eventAddress = address(0);
        TonToEthEvent(eventAddress).saveSign(signer, ethPublicKey, sign, signedAt, payload, minSigns);
    }

    //TODO
    function processEthToTonSign() external onlyOwner {

    }

    onBounce(TvmSlice slice) external {
        uint32 functionId = slice.decode(uint32);
        if (functionId == tvm.functionId(TonToEthEvent.saveSign)) {
            address signer;
            bytes ethPublicKey;
            bytes sign;
            uint256 signedAt;
            bytes payload;
            uint8 minSigns;

            (signer, ethPublicKey, sign, signedAt, payload, minSigns) = slice.decodeFunctionParams(TonToEthEvent.saveSign);

            TvmCell eventData = tvm.buildEmptyData(tvm.pubkey());
            TvmCell stateInit = tvm.buildStateInit(tonToEthEventCode, eventData);

            address eventAddress = new TonToEthEvent{stateInit : stateInit, value : 1e9}(this, ethAddress, payload, minSigns);

            TonToEthEvent(eventAddress).saveSign(signer, ethPublicKey, sign, signedAt, payload, minSigns);
        }

    }
}
