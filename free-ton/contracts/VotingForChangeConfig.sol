pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./interfaces/IBridgeConfigUpdater.sol";

contract VotingForChangeConfig is SimpleOwnable {

    address bridgeAddress;

    uint8 addEventTypeRequiredConfirmationsPercent;
    uint8 removeEventTypeRequiredConfirmationsPercent;
    uint8 addRelayRequiredConfirmationsPercent;
    uint8 removeRelayRequiredConfirmationsPercent;
    uint8 updateConfigRequiredConfirmationsPercent;
    TvmCell eventRootCode;
    TvmCell tonToEthEventCode;
    TvmCell ethToTonEventCode;

    uint256 changeNonce;

    mapping(address => bool) existsSigners;

    uint256 hash;

    address[] signers;
    uint256[] signaturesHighParts;
    uint256[] signaturesLowParts;

    constructor(
        address _bridgeAddress,
        uint8 _addEventTypeRequiredConfirmationsPercent,
        uint8 _removeEventTypeRequiredConfirmationsPercent,
        uint8 _addRelayRequiredConfirmationsPercent,
        uint8 _removeRelayRequiredConfirmationsPercent,
        uint8 _updateConfigRequiredConfirmationsPercent,
        TvmCell _eventRootCode,
        TvmCell _tonToEthEventCode,
        TvmCell _ethToTonEventCode,
        uint256 _changeNonce
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;

        addEventTypeRequiredConfirmationsPercent = _addEventTypeRequiredConfirmationsPercent;
        removeEventTypeRequiredConfirmationsPercent = _removeEventTypeRequiredConfirmationsPercent;
        addRelayRequiredConfirmationsPercent = _addRelayRequiredConfirmationsPercent;
        removeRelayRequiredConfirmationsPercent = _removeRelayRequiredConfirmationsPercent;
        updateConfigRequiredConfirmationsPercent = _updateConfigRequiredConfirmationsPercent;
        eventRootCode = _eventRootCode;
        tonToEthEventCode = _tonToEthEventCode;
        ethToTonEventCode = _ethToTonEventCode;

        changeNonce = _changeNonce;

        TvmBuilder builder;
        builder.store(
            addEventTypeRequiredConfirmationsPercent,
            removeEventTypeRequiredConfirmationsPercent,
            addRelayRequiredConfirmationsPercent,
            removeRelayRequiredConfirmationsPercent,
            updateConfigRequiredConfirmationsPercent,
            eventRootCode,
            tonToEthEventCode,
            ethToTonEventCode,
            changeNonce
        );
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
        require(existsSigners.exists(msg.sender) && existsSigners.at(msg.sender));

        IBridgeConfigUpdater(bridgeAddress).updateConfig(
            addEventTypeRequiredConfirmationsPercent,
            removeEventTypeRequiredConfirmationsPercent,
            addRelayRequiredConfirmationsPercent,
            removeRelayRequiredConfirmationsPercent,
            updateConfigRequiredConfirmationsPercent,
            eventRootCode,
            tonToEthEventCode,
            ethToTonEventCode,
            changeNonce,
            signers,
            signaturesHighParts,
            signaturesLowParts
        );
    }

    function getDetails() external view returns(uint8, uint8, uint8, uint8, uint8, TvmCell, TvmCell, TvmCell, uint256) {
        return (addEventTypeRequiredConfirmationsPercent,
                removeEventTypeRequiredConfirmationsPercent,
                addRelayRequiredConfirmationsPercent,
                removeRelayRequiredConfirmationsPercent,
                updateConfigRequiredConfirmationsPercent,
                eventRootCode,
                tonToEthEventCode,
                ethToTonEventCode,
                changeNonce);
    }
}
