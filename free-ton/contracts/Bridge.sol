pragma solidity >= 0.6.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./event-configuration-contracts/EthereumEventConfiguration.sol";
import "./event-configuration-contracts/TonEventConfiguration.sol";

import "./structures/BridgeConfigurationStructure.sol";
import "./structures/BridgeRelayStructure.sol";
import "./structures/VoteStructure.sol";


import "./utils/KeysOwnable.sol";


contract Bridge is KeysOwnable, BridgeConfigurationStructure, BridgeRelayStructure, VoteStructure {
    uint static _randomNonce;

    BridgeConfiguration bridgeConfiguration;

    event EventConfigurationCreationVote(address addr, uint relayKey, bool vote);
    event EventConfigurationCreationEnd(address addr, bool active);

    event BridgeConfigurationUpdateVote(BridgeConfiguration _bridgeConfiguration, uint relayKey, Vote vote);
    event BridgeConfigurationUpdateEnd(BridgeConfiguration _bridgeConfiguration, bool status);

    event BridgeRelaysUpdateVote(BridgeRelay target, uint relayKey, Vote vote);
    event BridgeRelaysUpdateEnd(BridgeRelay target, bool status);

    mapping(address => mapping(uint => bool)) eventConfigurationVotes;
    mapping(BridgeConfiguration => mapping(uint => bool)) bridgeConfigurationVotes;
    mapping(BridgeRelay => mapping(uint => bool)) bridgeRelayVotes;

    modifier onlyActive() {
        require(bridgeConfiguration.active == true, 12312);
        _;
    }

    function _requireOnlyActiveEventConfiguration(address eventConfiguration) view internal {
        uint16 total;
        uint16 confirmations;

        for ((, bool vote): eventConfigurationVotes[eventConfiguration]) {
            total += 1;
            if (vote) {
                confirmations += 1;
            }
        }

        require(confirmations >= bridgeConfiguration.eventConfigurationRequiredConfirmations
            && (total - confirmations) < bridgeConfiguration.eventConfigurationRequiredRejects, 12313);
    }

    /*
        Basic Bridge contract
        @param _relayKeys List of relays public keys
        @param _bridgeConfiguration Initial Bridge configuration
    */
    constructor(
        uint[] _relayKeys,
        BridgeConfiguration _bridgeConfiguration
    ) public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        for (uint i=0; i < _relayKeys.length; i++) {
            _grantOwnership(_relayKeys[i]);
        }

        bridgeConfiguration = _bridgeConfiguration;
        bridgeConfiguration.active = true;
    }

    /*
        Confirm TON Event configuration.
        @dev Called only by relay
        @param eventConfiguration TON event configuration contract address
        @param vote Confirm or reject (true / false)
    */
    function updateEventConfiguration(
        address eventConfiguration,
        bool vote
    ) public onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        uint key = msg.pubkey();
        uint16 requiredConfirmations = bridgeConfiguration.eventConfigurationRequiredConfirmations;
        uint16 requiredRejects = bridgeConfiguration.eventConfigurationRequiredRejects;
        bool hasAlreadyFinished = false;

        // Calculate existing votes
        uint16 total;
        uint16 confirmations;
        uint16 rejects;
        for ((uint existingKey, bool existingVote): eventConfigurationVotes[eventConfiguration]) {
            if (existingKey == key) {
                return; // do nothing when voting second time
            }

            total += 1;
            if (existingVote) {
                confirmations += 1;
            }
        }
        rejects = total - confirmations;

        // Insert new vote
        eventConfigurationVotes[eventConfiguration][msg.pubkey()] = vote;
        emit EventConfigurationCreationVote(eventConfiguration, msg.pubkey(), vote);

        // Emit voting end event once 
        hasAlreadyFinished = (confirmations >= requiredConfirmations) || (rejects >= requiredRejects);

        if (!hasAlreadyFinished && vote && (confirmations + 1) >= requiredConfirmations) {
            emit EventConfigurationCreationEnd(eventConfiguration, true);
        } else if (!hasAlreadyFinished && !vote && (rejects + 1) >= requiredRejects) {
            emit EventConfigurationCreationEnd(eventConfiguration, false);
        }
    }

    /*
        Get Bridge details.
        @returns _bridgeConfiguration Structure with Bridge configuration details
    */
    function getDetails() public view returns (
        BridgeConfiguration _bridgeConfiguration
    ) {
        return (
            bridgeConfiguration
        );
    }

    /*
        Get list of confirm and reject keys for specific address. Also get status - confirmed or not.

        @param eventConfiguration Address of the event configuration contract
        @returns confirmKeys List of keys who confirmed the configuration
        @returns rejectKeys List of keys who rejected the configuration
        @returns status Is configuration confirmed or rejected (same as not confirmed)
    */
    function getEventConfigurationStatus(
        address eventConfiguration
    ) public view returns (
        uint[] confirmKeys,
        uint[] rejectKeys,
        bool status
    ) {
        for ((uint key, bool vote): eventConfigurationVotes[eventConfiguration]) {
            if (vote == true) {
                confirmKeys.push(key);
            } else {
                rejectKeys.push(key);
            }
        }

        if (rejectKeys.length >= bridgeConfiguration.eventConfigurationRequiredRejects) {
            status = false;
        } else if (confirmKeys.length >= bridgeConfiguration.eventConfigurationRequiredConfirmations) {
            status = true;
        }
    }

    /*
        Get list of active event configuration contracts
        @returns eventConfigurations List of active event configuration contracts
    */
    function getActiveEventConfigurations() public view returns (
        address[] contracts
    ) {
        uint16 requiredRejects = bridgeConfiguration.eventConfigurationRequiredRejects;
        uint16 requiredConfirmations = bridgeConfiguration.eventConfigurationRequiredConfirmations;

        for ((address addr, mapping(uint => bool) votes): eventConfigurationVotes) {
            uint16 total;
            uint16 confirmations;
            for ((, bool vote): votes) {
                total += 1;
                if (vote) {
                    confirmations += 1;
                }
            }

            if (confirmations >= requiredConfirmations && (total - confirmations) < requiredRejects) {
                contracts.push(addr);
            }
        }
    }

    /*
        Confirm Ethereum event instance.
        @dev Called only by relay
        @param eventTransaction Ethereum event transaction ID
        @param eventIndex Ethereum event index
        @param eventData Ethereum event encoded data
        @param eventBlockNumber Ethereum block number including event transaction
        @param eventBlock Ethereum block hash including event transaction
        @param eventConfiguration Ethereum Event configuration contract address
    */
    function confirmEthereumEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        address eventConfiguration
    ) public view onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        _requireOnlyActiveEventConfiguration(eventConfiguration);

        EthereumEventConfiguration(eventConfiguration).confirmEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            msg.pubkey()
        );
    }

    /*
        Reject Ethereum event instance.
        @dev Called only by relay. Only reject already existing EthereumEvent contract, not create it.
        @param eventTransaction Ethereum event transaction ID
        @param eventIndex Ethereum event index
        @param eventData Ethereum event encoded data
        @param eventBlockNumber Ethereum block number including event transaction
        @param eventBlock Ethereum block hash including event transaction
        @param eventConfiguration Ethereum Event configuration contract address
    */
    function rejectEthereumEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        address eventConfiguration
    ) public view onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        _requireOnlyActiveEventConfiguration(eventConfiguration);

        EthereumEventConfiguration(eventConfiguration).rejectEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            msg.pubkey()
        );
    }

    /*
        Confirm TON event instance.
        @dev Called only by relay
        @param eventTransaction TON event transaction
        @param eventIndex TON event index (message number)
        @param eventData TON event encoded data
        @param eventBlockNumber TON block number including event transaction
        @param eventBlock TON block hash including event transaction
        @param eventDataSignature Relay's signature of the Ethereum callback
        @param eventConfiguration Ethereum Event configuration contract address
    */
    function confirmTonEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        bytes eventDataSignature,
        address eventConfiguration
    ) public view onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        _requireOnlyActiveEventConfiguration(eventConfiguration);

        TonEventConfiguration(eventConfiguration).confirmEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            eventDataSignature,
            msg.pubkey()
        );
    }

    /*
        Reject TON event instance.
        @dev Called only by relay. Only reject already existing TonEvent contract, not create it.
        @param eventTransaction TON event transaction
        @param eventIndex TON event index (message number)
        @param eventData TON event encoded data
        @param eventBlockNumber TON block number including event transaction
        @param eventBlock TON block hash including event transaction
        @param eventDataSignature Relay's signature of the Ethereum callback
        @param eventConfiguration Ethereum Event configuration contract address
    */
    function rejectTonEvent(
        uint eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        uint eventBlockNumber,
        uint eventBlock,
        address eventConfiguration
    ) public view onlyActive onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        _requireOnlyActiveEventConfiguration(eventConfiguration);

        TonEventConfiguration(eventConfiguration).rejectEvent{value: 1 ton}(
            eventTransaction,
            eventIndex,
            eventData,
            eventBlockNumber,
            eventBlock,
            msg.pubkey()
        );
    }

    function getVotingDirection(Vote _vote) public pure returns(bool vote) {
        if (_vote.signature.length == 0) {
            vote = false;
        } else {
            vote = true;
        }
    }

    /*
        Vote for Bridge configuration update
        @dev Can be called only by relay
        @param _bridgeConfiguration New bridge configuration
        @param _vote Vote structure. Signature and payload are empty for reject.
    */
    function updateBridgeConfiguration(
        BridgeConfiguration _bridgeConfiguration,
        Vote _vote
    ) public onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        emit BridgeConfigurationUpdateVote(_bridgeConfiguration, msg.pubkey(), _vote);

        bool vote = getVotingDirection(_vote);

        bridgeConfigurationVotes[_bridgeConfiguration][msg.pubkey()] = vote;

        // Check the results
        (uint[] confirmKeys, uint[] rejectKeys) = getBridgeConfigurationVotes(_bridgeConfiguration);

        // - If enough confirmations received - update configuration and remove voting
        if (confirmKeys.length == bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations) {
            bridgeConfiguration = _bridgeConfiguration;
            _removeBridgeConfigurationVoting(_bridgeConfiguration);

            emit BridgeConfigurationUpdateEnd(_bridgeConfiguration, true);
        }

        // - If enough rejects received - remove voting
        if (rejectKeys.length == bridgeConfiguration.bridgeConfigurationUpdateRequiredRejects) {
            _removeBridgeConfigurationVoting(_bridgeConfiguration);

            emit BridgeConfigurationUpdateEnd(_bridgeConfiguration, false);
        }
    }

    function _removeBridgeConfigurationVoting(
        BridgeConfiguration _bridgeConfiguration
    ) internal {
        delete bridgeConfigurationVotes[_bridgeConfiguration];
    }

    /*
        Get list of votes for bridge configuration update ID
        @param _bridgeConfiguration Bridge configuration
        @returns confirmKeys List of keys who confirmed the update
        @returns rejectKeys List of keys who rejected the update
    */
    function getBridgeConfigurationVotes(
        BridgeConfiguration _bridgeConfiguration
    ) public view returns(
        uint[] confirmKeys,
        uint[] rejectKeys
    ) {
        for ((uint key, bool vote): bridgeConfigurationVotes[_bridgeConfiguration]) {
            if (vote == true) {
                confirmKeys.push(key);
            } else {
                rejectKeys.push(key);
            }
        }
    }

    /*
        Vote for Bridge relays update
        @dev Called only by relay
        @param target Target relay
        @param _vote Vote structure. Signature and payload are empty for reject.
    */
    function updateBridgeRelays(
        BridgeRelay target,
        Vote _vote
    ) public onlyOwnerKey(msg.pubkey()) {
        tvm.accept();

        emit BridgeRelaysUpdateVote(target, msg.pubkey(), _vote);

        bool vote = getVotingDirection(_vote);

        bridgeRelayVotes[target][msg.pubkey()] = vote;

        // Check the results
        (uint[] confirmKeys, uint[] rejectKeys) = getBridgeRelayVotes(target);

        // - If enough confirmations received - update configuration and remove voting
        if (confirmKeys.length == bridgeConfiguration.bridgeRelayUpdateRequiredConfirmations) {
            if (target.action) {
                _grantOwnership(target.key);
            } else {
                _removeOwnership(target.key);
            }

            _removeBridgeRelayVoting(target);

            emit BridgeRelaysUpdateEnd(target, true);
        }

        // - If enough rejects received - remove voting
        if (rejectKeys.length == bridgeConfiguration.bridgeRelayUpdateRequiredRejects) {
            _removeBridgeRelayVoting(target);

            emit BridgeRelaysUpdateEnd(target, false);
        }
    }

    function getBridgeRelayVotes(
        BridgeRelay target
    ) public view returns(uint[] confirmKeys, uint[] rejectKeys) {
        for ((uint key, bool vote): bridgeRelayVotes[target]) {
            if (vote == true) {
                confirmKeys.push(key);
            } else {
                rejectKeys.push(key);
            }
        }
    }

    function _removeBridgeRelayVoting(
        BridgeRelay target
    ) internal {
        delete bridgeRelayVotes[target];
    }
}
