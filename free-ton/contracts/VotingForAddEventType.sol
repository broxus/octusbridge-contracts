pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./interfaces/IEventConfigUpdater.sol";

contract VotingForAddEventType is SimpleOwnable {

    address bridgeAddress;

    address tonAddress;
    bytes ethAddress;
    //  bytes ethEventABI;
    //  address eventProxyAddress;
    uint8 minSigns;
    uint8 minSignsPercent;

    uint256 changeNonce;

    mapping(address => bool) existsSigners;

    address[] signers;
    uint256[] signaturesHighParts;
    uint256[] signaturesLowParts;

    constructor(
        address _bridgeAddress,
        address _tonAddress,
        bytes _ethAddress,
//      bytes _ethEventABI,
//      address _eventProxyAddress,
        uint8 _minSigns,
        uint8 _minSignsPercent,
        uint256 _changeNonce
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;

        tonAddress = _tonAddress;
        ethAddress = _ethAddress;
//      ethEventABI = _ethEventABI;
//      eventProxyAddress = _eventProxyAddress
        minSigns = _minSigns;
        minSignsPercent = _minSignsPercent;

        changeNonce = _changeNonce;
    }

    function vote(
        address signer,
        uint256 highPart,
        uint256 lowPart,
        uint256 publicKey
    ) external onlyOwner returns (bool) {
        require(!existsSigners.exists(signer));

        TvmBuilder builder;
        builder.store(
            tonAddress,
            ethAddress,
//          ethEventABI
//          eventProxyAddress,
            minSigns,
            minSignsPercent,
            changeNonce);
        TvmCell cell = builder.toCell();
        uint256 hash = tvm.hash(cell);

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
            tonAddress,
            ethAddress,
//          bytes _ethEventABI,
//          address _eventProxyAddress,
            minSigns,
            minSignsPercent,
            changeNonce,
            signers,
            signaturesHighParts,
            signaturesLowParts);
    }

    function getDetails() external view returns(address, bytes, uint8, uint8, uint256) {
        return (tonAddress, ethAddress, minSigns, minSignsPercent, changeNonce);
    }
}
