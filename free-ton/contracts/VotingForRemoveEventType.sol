pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";
import "./interfaces/IEventConfigUpdater.sol";

contract VotingForRemoveEventType is SimpleOwnable {

    address bridgeAddress;

    address tonAddress;

    uint256 changeNonce;

    mapping(address => bool) existsSigners;

    address[] signers;
    uint256[] signaturesHighParts;
    uint256[] signaturesLowParts;

    constructor(
        address _bridgeAddress,
        address _tonAddress,
        uint256 _changeNonce
    ) public {
        tvm.accept();

        bridgeAddress = _bridgeAddress;

        tonAddress = _tonAddress;

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
        builder.store(tonAddress, changeNonce);
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
        require(existsSigners.exists(msg.sender) && existsSigners.at(msg.sender));

        IEventConfigUpdater(bridgeAddress).removeEventType(
            tonAddress,
            changeNonce,
            signers,
            signaturesHighParts,
            signaturesLowParts);
    }

    function getDetails() external view returns(address, uint256) {
        return (tonAddress, changeNonce);
    }
}
