pragma solidity >= 0.5.0;

interface IEventConfigUpdater {

    function addEventType(
        address tonAddress,
        bytes ethAddress,
    //      bytes ethEventABI,
    //      address eventProxyAddress,
        uint8 minSigns,
        uint8 minSignsPercent,
        uint256 changeNonce,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts
    ) external;

    function removeEventType(
        address tonAddress,
        uint256 changeNonce,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts
    ) external;
}
