// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;


import "./interfaces/IBridge.sol";
import "./libraries/ECDSA.sol";
import "./utils/Ownable.sol";


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


/**
    @title Ethereum Bridge contract.
    @dev Stores relays for each round
    // TODO: only next round relays can be set?
**/
contract Bridge is Initializable, Ownable, IBridge {
    using ECDSA for bytes32;

    mapping (uint32 => mapping(address => bool)) public roundRelays;
    BridgeConfiguration public configuration;

    /**
        @param admin Bridge admin
        @param relays Set of relays for round 0
    **/
    function initialize(
        address admin,
        BridgeConfiguration calldata _configuration,
        address[] calldata relays
    ) external initializer {
        _transferOwnership(admin);

        _setConfiguration(_configuration);

        _setRoundRelays(0, relays);
    }

    /*
        @notice Internal function for setting bridge configuration
        @param _configuration Bridge configuration
    */
    function _setConfiguration(
        BridgeConfiguration memory _configuration
    ) internal {
        configuration = _configuration;

        emit NewConfiguration(_configuration);
    }

    /*
        @notice Internal function for setting up relays for specific round
        @param round Round id
        @param relays Array of relay addresses
    */
    function _setRoundRelays(
        uint32 round,
        address[] memory relays
    ) internal {
        for (uint i=0; i<relays.length; i++) {
            roundRelays[round][relays[i]] = true;
        }

        emit RoundRelays(round, relays);
    }

    /*
        @notice Answers if specific address was relay in specific round
        @param round Round id
        @param candidate Address to check
    */
    function isRelay(
        uint32 round,
        address candidate
    ) override public view returns (bool) {
        return roundRelays[round][candidate];
    }

    /*
        @notice Count how many signatures are made by correct relays from
        @dev Signatures should be sorted by the ascending signers
        so it's easier to detect duplicates
        @param round Round id
        @param payload Bytes encoded payload
        @param signatures Payload signatures
\    */
    function countRelaySignatures(
        uint32 round,
        bytes memory payload,
        bytes[] memory signatures
    ) override public view returns (uint32 count) {
        address lastSigner = address(0);
        count = 0;

        for (uint i=0; i<signatures.length; i++) {
            address signer = recoverSignature(payload, signatures[i]);

            require(signer > lastSigner, "Bridge: signatures sequence wrong");
            lastSigner = signer;

            if (isRelay(round, signer)) {
                count++;
            }
        }
    }

    /*
        @notice Recover signer from the payload and signature
        @param payload Payload
        @param signature Signature
    */
    function recoverSignature(
        bytes memory payload,
        bytes memory signature
    ) public pure returns (address signer) {
        signer = keccak256(payload)
            .toBytesPrefixed()
            .recover(signature);
    }

    /*
        @notice Set relays for specific round
        @dev Checks enough relay signatures are given for specified round
        @param payload Encoded TON event
        @param signatures Payload signatures
    */
    function setRoundRelays(
        bytes calldata payload,
        bytes[] calldata signatures
    ) override external {
        // Decode payload
        (TONEvent memory tonEvent) = abi.decode(payload, (TONEvent));

        // Check enough correct signatures
        require(
            countRelaySignatures(tonEvent.round, payload, signatures) >= configuration.requiredSignatures,
            "Bridge: not enough relay signatures"
        );

        require(
            tonEvent.proxy == address(this),
            "Bridge: wrong event proxy"
        );

        // Decode relays and corresponding round
        (uint32 round, address[] memory relays) = abi.decode(
            tonEvent.eventData,
            (uint32, address[])
        );

        _setRoundRelays(round, relays);
    }

//    function removeRoundRelays(
//
//    )

    /*
        @notice Update bridge configuration
        @dev Only owner
        @param _configuration New bridge configuration
    */
    function setConfiguration(
        BridgeConfiguration calldata _configuration
    ) override onlyOwner external {
        _setConfiguration(_configuration);
    }
}
