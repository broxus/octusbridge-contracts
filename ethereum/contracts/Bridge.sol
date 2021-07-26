// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./interfaces/IBridge.sol";
import "./libraries/ECDSA.sol";

import "./utils/Cache.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


/// @title Ethereum Bridge contract
/// @author https://github.com/pavlovdog
/// @dev Stores relays for each round, implements slashing
contract Bridge is OwnableUpgradeable, Cache, IBridge {
    using ECDSA for bytes32;

    mapping (uint32 => mapping(address => bool)) public roundRelays;
    mapping (address => bool) relaysBlackList;
    mapping (uint32 => uint32) public roundRequiredSignatures;
    BridgeConfiguration public configuration;
    uint public lastRound;

    /// @dev Initializer
    /// @param admin Bridge admin
    /// @param _configuration Initial bridge configuration
    /// @param relays Initial set of relays (round 0). Encode addresses as uint160
    function initialize(
        address admin,
        BridgeConfiguration calldata _configuration,
        uint160[] calldata relays
    ) external initializer {
        __Ownable_init();
        transferOwnership(admin);

        _setConfiguration(_configuration);

        _setRoundRelays(0, relays);

        lastRound = 0;
    }

    /// @dev Check if relay is banned.
    /// Ban is global. If the relay is blacklisted it means it lost
    /// relay power in all rounds, past and future.
    /// @param candidate Address to check
    function isBanned(
        address candidate
    ) override public view returns(bool) {
        return relaysBlackList[candidate];
    }

    /// @dev Check if some address is relay at specific round
    /// @param round Round id
    /// @param candidate Address to check
    function isRelay(
        uint32 round,
        address candidate
    ) override public view returns (bool) {
        return relaysBlackList[candidate] ? false : roundRelays[round][candidate];
    }

    /// @dev Verify there is enough relay signatures
    /// Required amount of signatures is (2/3 * relays at round) + 1.
    /// Signatures should be sorted by the ascending signers, so it's cheaper to detect duplicates
    /// @param round Round id
    /// @param payload Bytes encoded payload
    /// @param signatures Payload signatures
    /// @return All checks are passed or not
    function verifyRelaySignatures(
        uint32 round,
        bytes memory payload,
        bytes[] memory signatures
    ) override public view returns (bool) {
        // TODO: discuss min amount of required signatures
        require(round <= lastRound, "Bridge: too high round");

        address lastSigner = address(0);
        uint32 count = 0;

        uint32 requiredSignatures = roundRequiredSignatures[round];

        for (uint i=0; i<signatures.length; i++) {
            address signer = recoverSignature(payload, signatures[i]);

            require(signer > lastSigner, "Bridge: signatures sequence wrong");
            lastSigner = signer;

            if (isRelay(round, signer) && !isBanned(signer)) {
                count++;
            }
        }

        return count >= requiredSignatures;
    }

    /// @notice Recover signer from the payload and signature
    /// @param payload Payload
    /// @param signature Signature
    function recoverSignature(
        bytes memory payload,
        bytes memory signature
    ) public pure returns (address signer) {
        signer = keccak256(payload)
            .toBytesPrefixed()
            .recover(signature);
    }

    /// @dev Grant relay permission for set of addresses at specific round
    /// @param payload Bytes encoded TONEvent structure
    /// @param signatures Payload signatures
    function setRoundRelays(
        bytes calldata payload,
        bytes[] calldata signatures
    ) override external notCached(payload) {
        // TODO: discuss removing relays
        (IBridge.TONEvent memory tonEvent) = abi.decode(payload, (IBridge.TONEvent));

        require(
            verifyRelaySignatures(
                tonEvent.round,
                payload,
                signatures
            ),
            "Bridge: signatures verification failed"
        );

        require(
            tonEvent.proxy == address(this),
            "Bridge: wrong event proxy"
        );

        (uint32 round, uint160[] memory relays) = abi.decode(
            tonEvent.eventData,
            (uint32, uint160[])
        );

        require(round == lastRound + 1, "Bridge: wrong round");

        lastRound++;

        _setRoundRelays(round, relays);
    }

    /// @dev Ban relay. Ban is global for rounds, so relay's signatures becomes invalid in all past and future rounds
    /// @param relays List of relay addresses to ban
    function banRelays(
        address[] calldata relays
    ) override external onlyOwner {
        for (uint i=0; i<relays.length; i++) {
            relaysBlackList[relays[i]] = true;

            emit RelayBanned(relays[i]);
        }
    }

    /// @notice Set bridge configuration
    /// @param _configuration New bridge configuration
    function setConfiguration(
        BridgeConfiguration calldata _configuration
    ) override external onlyOwner {
        _setConfiguration(_configuration);
    }

    function _setConfiguration(
        BridgeConfiguration memory _configuration
    ) internal {
        configuration = _configuration;

        emit ConfigurationUpdate(_configuration);
    }

    function _setRoundRelays(
        uint32 round,
        uint160[] memory relays
    ) internal {
        uint32 requiredSignatures = uint32(relays.length * 2 / 3) + 1;

        require(requiredSignatures >= configuration.requiredSignatures, 'Bridge: too low required signatures');

        roundRequiredSignatures[round] = requiredSignatures;

        for (uint i=0; i<relays.length; i++) {
            roundRelays[round][address(relays[i])] = true;

            emit RoundRelayGranted(round, address(relays[i]));
        }
    }
}
