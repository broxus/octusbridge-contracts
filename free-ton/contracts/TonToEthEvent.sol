pragma solidity >= 0.5.0;

import "./SimpleOwnable.sol";

contract TonToEthEvent is SimpleOwnable {

    address rootEventAddress;
    bytes ethAddress;
    bytes payload;
    uint8 minSigns;

    address[] signers;
    bytes[] signs;
    uint256[] signedAt;

    mapping(address => bool) existsSigners;

    constructor(
        address _rootEventAddress,
        bytes _ethAddress,
        bytes _payload,
        uint8 _minSigns
    ) public {
        rootEventAddress = _rootEventAddress;
        ethAddress = _ethAddress;
        payload = _payload;
        minSigns = _minSigns;
    }

    function saveSign(
        address signer,
        bytes sign,
        uint256 ts
    ) external onlyOwner {
        require(!existsSigners.exists(signer));

        signers.push(signer);
        signs.push(sign);
        signedAt.push(ts);

        existsSigners[signer] = true;
    }

    function getDetails() public view returns(address, bytes, bytes, uint8, address[], bytes[], uint256[]) {
        return (rootEventAddress, ethAddress, payload, minSigns, signers, signs, signedAt);
    }
}
