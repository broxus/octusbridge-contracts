pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./interfaces/IEventConfigUpdater.sol";

contract VotingForAddEventType is SimpleOwnable {

    address bridgeAddress;

    bytes ethAddress;
    bytes ethEventABI;
    address eventProxyAddress;
    uint8 minSigns;
    uint8 minSignsPercent;
    uint256 tonToEthRate;
    uint256 ethToTonRate;

    uint256 changeNonce;

    mapping(address => bool) existsSigners;

    uint256 hash;

    address[] signers;
    uint256[] signaturesHighParts;
    uint256[] signaturesLowParts;

    constructor(
        address _bridgeAddress,
        bytes _ethAddress,
        bytes _ethEventABI,
        address _eventProxyAddress,
        uint8 _minSigns,
        uint8 _minSignsPercent,
        uint256 _tonToEthRate,
        uint256 _ethToTonRate,
        uint256 _changeNonce
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;

        ethAddress = _ethAddress;
        ethEventABI = _ethEventABI;
        eventProxyAddress = _eventProxyAddress;
        minSigns = _minSigns;
        minSignsPercent = _minSignsPercent;
        tonToEthRate = _tonToEthRate;
        ethToTonRate = _ethToTonRate;

        changeNonce = _changeNonce;

        TvmBuilder builder;
        builder.store(
            ethAddress,
            ethEventABI,
            eventProxyAddress,
            minSigns,
            minSignsPercent,
            tonToEthRate,
            ethToTonRate,
            changeNonce);
        TvmCell cell = builder.toCell();
        hash = tvm.hash(cell);
    }

    function vote(
        address signer,
        uint256 highPart,
        uint256 lowPart,
        uint256 publicKey
    ) external onlyOwner returns (bool) {
        require(!existsSigners.exists(signer));

        if(tvm.checkSign(hash, highPart, lowPart, publicKey)) {
            signers.push(signer);
            signaturesHighParts.push(highPart);
            signaturesLowParts.push(lowPart);

            existsSigners[signer] = true;

            return true;
        } else {
            return false;
        }

    }

    function applyChange() public {
        IEventConfigUpdater(bridgeAddress).addEventType(
            ethAddress,
            ethEventABI,
            eventProxyAddress,
            minSigns,
            minSignsPercent,
            tonToEthRate,
            ethToTonRate,
            changeNonce,
            signers,
            signaturesHighParts,
            signaturesLowParts);
    }

    function getDetails() external view returns(bytes, bytes, address, uint8, uint8, uint256, uint256, uint256) {
        return (ethAddress, ethEventABI, eventProxyAddress, minSigns, minSignsPercent, tonToEthRate, ethToTonRate, changeNonce);
    }
}
