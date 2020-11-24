pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./interfaces/IEventProxy.sol";

contract EthToTonEvent is SimpleOwnable {

    address rootEventAddress;
    address eventProxyAddress;
    bytes payload;
    uint8 minSigns;

    mapping(address => bool) existsSigners;

    uint256 hash;

    address[] signers;
    uint256[] signaturesHighParts;
    uint256[] signaturesLowParts;

    bool signsReached;

    constructor(
        address _rootEventAddress,
        address _eventProxyAddress,
        bytes _payload,
        uint8 _minSigns
    ) public {
        rootEventAddress = _rootEventAddress;
        eventProxyAddress = _eventProxyAddress;
        payload = _payload;
        minSigns = _minSigns;

        TvmBuilder builder;
        builder.store(
            rootEventAddress,
            eventProxyAddress,
            payload,
            minSigns
        );
        TvmCell cell = builder.toCell();
        hash = tvm.hash(cell);

        signsReached = false;
    }

    function processSign(
        address signer,
        uint256 highPart,
        uint256 lowPart,
        uint256 publicKey
    ) external onlyOwner returns(bool) {
        require(!existsSigners.exists(signer));

        if(tvm.checkSign(hash, highPart, lowPart, publicKey)) {
            signers.push(signer);
            signaturesHighParts.push(highPart);
            signaturesLowParts.push(lowPart);

            existsSigners[signer] = true;

            if (signers.length >= minSigns && !signsReached) {
                IEventProxy(eventProxyAddress).bridgeCallback(payload);
                signsReached = true;
            }

            return true;
        } else {
            return false;
        }
    }

    function getDetails() public view returns(address, address, bytes, uint8, address[], uint256[], uint256[]) {
        return (rootEventAddress, eventProxyAddress, payload, minSigns, signers, signaturesHighParts, signaturesLowParts);
    }
}
