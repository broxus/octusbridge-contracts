pragma solidity >= 0.5.0;
pragma AbiHeader expire;


import "./EventsContract.sol";
import "./VotingForAddEventType.sol";
import "./VotingForRemoveEventType.sol";

contract FreeTonBridge is IEventConfigUpdater {
    uint public nonce;

    struct EthereumEventConfiguration {
        bytes[] ethereumEventABI;
        bytes[] ethereumAddress;
        address eventProxyAddress;
        uint confirmations;
        bool confirmed;
    }

    EthereumEventConfiguration[] ethereumEventsConfiguration;
    uint ethereumEventConfigurationRequiredConfirmations;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        ethereumEventConfigurationRequiredConfirmations = 2;

        changeNonce = 0;
        eventConfigurationRequiredConfirmationsPercent = 65;
    }

    /**
        @notice Propose new Ethereum event configuration. Need more confirmation in general
        @dev One confirmation is received from the proposal author
        @param ethereumEventABI Bytes encoded Event ABI
        @param ethereumAddress Bytes encoded Ethereum address
        @param eventProxyAddress TON address of the corresponding event proxy address (callback implementation)
    **/
    function addEthereumEventConfiguration(
        bytes[] ethereumEventABI,
        bytes[] ethereumAddress,
        address eventProxyAddress
    ) public {
        tvm.accept();

        ethereumEventsConfiguration.push(EthereumEventConfiguration({
            ethereumEventABI: ethereumEventABI,
            ethereumAddress: ethereumAddress,
            eventProxyAddress: eventProxyAddress,
            confirmations: 0,
            confirmed: false
        }));

        confirmEthereumEventConfiguration(ethereumEventsConfiguration.length - 1);
    }

    /**
        @notice Confirm Ethereum event configuration.
        @param ethereumEventConfigurationID Sequential ID of the Ethereum event configuration
    **/
    function confirmEthereumEventConfiguration(uint ethereumEventConfigurationID) public {
        tvm.accept();

        require(ethereumEventConfigurationID < ethereumEventsConfiguration.length);

        ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations++;

        if (ethereumEventsConfiguration[ethereumEventConfigurationID].confirmations >= ethereumEventConfigurationRequiredConfirmations) {
            ethereumEventsConfiguration[ethereumEventConfigurationID].confirmed = true;
        }
    }

    /**
        @notice Confirm new Ethereum event
        @dev In case there's no previous confirmation - new Event Contract will be deployed under the hood
        @param ethereumEventConfigurationID Sequential ID of the Ethereum event configuration
        @param ethereumEventData Encoded data of the Ethereum event
    **/
    function confirmEventInstance(
        uint ethereumEventConfigurationID,
        TvmCell ethereumEventData
    ) public {
        // Calculate
    }

    function getEthereumEventsConfiguration() external view returns (EthereumEventConfiguration[]) {
        tvm.accept();
        return ethereumEventsConfiguration;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////
    //tonToEth

    function isRelay() public view returns (bool) {
        return currentRelays.exists(msg.sender) && currentRelays.at(msg.sender);
    }

    modifier onlyRelay() {
        require(isRelay(), 100);
        _;
    }

    mapping(address => bool) currentRelays;
    uint8 currentRelaysCount;

    //change nonce => is applied
    mapping(uint256 => bool) appliedChanges;
    uint256 changeNonce;
    uint8 eventConfigurationRequiredConfirmationsPercent;

    mapping(address => uint256) relaysTonPublicKeys;
//  mapping(address => uint256) relaysEthPublicKeys;

    //TODO: merge it with EthereumEventConfiguration to EventConfiguration
    struct TonEventConfiguration {
        address tonAddress;
        bytes ethAddress;
//      bytes ethEventABI;
//      address eventProxyAddress;
        uint8 minSigns;
        uint8 minSignsPercent;
    }

//  mapping(bytes => address) ethToTonMap;
    mapping(address => bytes) tonToEthMap;
    mapping(address => TonEventConfiguration) tonToConfig;

    function validSignaturesCount(
        uint256 hash,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts) private returns (uint8) {

        require(signers.length == signaturesHighParts.length);
        require(signers.length == signaturesLowParts.length);

        uint8 validCount = 0;

        for (uint i = 0; i < signers.length; i++){
            if (currentRelays.exists(signers[i]) && currentRelays.at(signers[i]) && relaysTonPublicKeys.exists(signers[i]) &&
                tvm.checkSign(hash, signaturesHighParts[i], signaturesLowParts[i], relaysTonPublicKeys.at(signers[i]))) {
                validCount++;
            }
        }

        return validCount;
    }

    // Add EventType logic

    event VotingForAddEventTypeStarted(address votingAddress);

    function addEventType(
        address tonAddress,
        bytes ethAddress,
//      bytes ethEventABI,
//      address eventProxyAddress,
        uint8 minSigns,
        uint8 minSignsPercent,
        uint256 _changeNonce,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts
    ) external override {

        require(minSigns > 0 || minSignsPercent > 0);
        require(minSignsPercent <= 100);
        require(!appliedChanges.exists(_changeNonce));
        require(!tonToEthMap.exists(tonAddress));
//      require(!ethToTonMap.exists(ethAddress));

        TvmBuilder builder;
        builder.store(
            tonAddress,
            ethAddress,
//          ethEventABI
//          eventProxyAddress,
            minSigns,
            minSignsPercent,
            _changeNonce);
        TvmCell cell = builder.toCell();
        uint256 hash = tvm.hash(cell);

        if (validSignaturesCount(hash, signers, signaturesHighParts, signaturesLowParts) * 100 / currentRelaysCount >=
            eventConfigurationRequiredConfirmationsPercent) {

            appliedChanges[_changeNonce] = true;

            TonEventConfiguration newConfig = TonEventConfiguration({
                tonAddress: tonAddress,
                ethAddress: ethAddress,
//              ethEventABI: ethEventABI,
//              eventProxyAddress: eventProxyAddress,
                minSigns: minSigns,
                minSignsPercent: minSignsPercent
            });

//          ethToTonMap[ethAddress] = tonAddress;
            tonToEthMap[tonAddress] = ethAddress;
            tonToConfig[tonAddress] = newConfig;

        }

    }

    function startVotingForAddEventType(
        TvmCell stateInit,
        address tonAddress,
        bytes ethAddress,
    //      bytes ethEventABI,
    //      address eventProxyAddress,
        uint8 minSigns,
        uint8 minSignsPercent
    ) public onlyRelay {

        require(minSigns > 0 || minSignsPercent > 0);
        require(minSignsPercent <= 100);

        address voting = new VotingForAddEventType{stateInit : stateInit, value : msg.value}(this, tonAddress, ethAddress, minSigns, minSignsPercent, changeNonce);

        emit VotingForAddEventTypeStarted(voting);

        changeNonce++;
    }

    function voteForAddEventType(
        address votingAddress,
        uint256 highPart,
        uint256 lowPart
    ) public onlyRelay {
        VotingForAddEventType(votingAddress).vote(msg.sender, highPart, lowPart, relaysTonPublicKeys.at(msg.sender));
    }

    // Remove EventType logic

    event VotingForRemoveEventTypeStarted(address votingAddress);

    function removeEventType(
        address tonAddress,
        uint256 _changeNonce,
        address[] signers,
        uint256[] signaturesHighParts,
        uint256[] signaturesLowParts
    )  external override {

        require(!appliedChanges.exists(_changeNonce));

        TvmBuilder builder;
        builder.store(tonAddress, _changeNonce);
        TvmCell cell = builder.toCell();
        uint256 hash = tvm.hash(cell);

        if (validSignaturesCount(hash, signers, signaturesHighParts, signaturesLowParts) * 100 / currentRelaysCount >=
            eventConfigurationRequiredConfirmationsPercent) {

            appliedChanges[_changeNonce] = true;
//          bytes ethAddress = tonToEthMap.at(tonAddress);
//          delete ethToTonMap[ethAddress];
            delete tonToEthMap[tonAddress];
            delete tonToConfig[tonAddress];

        }

    }

    function startVotingForRemoveEventType(
        TvmCell stateInit,
        address tonAddress
    ) public onlyRelay {

        address voting = new VotingForRemoveEventType{stateInit : stateInit, value : msg.value}(this, tonAddress, changeNonce);

        emit VotingForRemoveEventTypeStarted(voting);

        changeNonce++;
    }

    function voteForRemoveEventType(
        address votingAddress,
        uint256 highPart,
        uint256 lowPart
    ) public onlyRelay {
        VotingForRemoveEventType(votingAddress).vote(msg.sender, highPart, lowPart, relaysTonPublicKeys.at(msg.sender));
    }


}
