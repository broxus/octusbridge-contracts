pragma solidity >= 0.5.0;

interface IBridgeConfigUpdater {
    function updateConfig(
        uint8 addEventTypeRequiredConfirmationsPercent,
        uint8 removeEventTypeRequiredConfirmationsPercent,
        uint8 addRelayRequiredConfirmationsPercent,
        uint8 removeRelayRequiredConfirmationsPercent,
        uint8 updateConfigRequiredConfirmationsPercent,
        TvmCell tonToEthEventCode,
        uint256 _changeNonce,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts
    ) external;
}
