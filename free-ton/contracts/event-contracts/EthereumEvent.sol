pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;


import "./../interfaces/IProxy.sol";
import "./../interfaces/IEvent.sol";
import "./../interfaces/IEventNotificationReceiver.sol";

import "./../utils/ErrorCodes.sol";
import "./../utils/TransferUtils.sol";
import "./../utils/cell-encoder/CellEncoder.sol";

import './../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol';

/*
    @title Basic example of Ethereum event configuration
    @dev This implementation is used for cross chain token transfers
*/
contract EthereumEvent is IEvent, TransferUtils, CellEncoder {
    EthereumEventInitData static public initData;
    EthereumEventStatus public status;

    mapping (address => Vote) votes;

    address public executor;

    modifier eventPending() {
        require(status == EthereumEventStatus.Pending, ErrorCodes.EVENT_NOT_PENDING);
        _;
    }

    modifier eventConfirmed() {
        require(status == EthereumEventStatus.Confirmed, ErrorCodes.EVENT_NOT_CONFIRMED);
        _;
    }

    modifier onlyEventConfiguration() {
        require(
            msg.sender == initData.ethereumEventConfiguration,
            ErrorCodes.SENDER_NOT_EVENT_CONFIGURATION
        );

        _;
    }

    /*
        @notice Get voters by the vote type
        @param vote Vote type
        @returns voters List of voters (relays) addresses
    */
    function getVoters(Vote vote) public view returns(address[] voters) {
        for ((address voter, Vote vote_): votes) {
            if (vote_ == vote) {
                voters.push(voter);
            }
        }
    }

    /*
        @dev Should be deployed only by EthereumEventConfiguration contract
        @param relay Public key of the relay, who initiated the event creation
    */
    constructor(
        address relay
    ) public {
        initData.ethereumEventConfiguration = msg.sender;
        status = EthereumEventStatus.Pending;

        notifyEventStatusChanged();

        confirm(relay);
    }

    /*
        @notice Confirm event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param relay Relay, who initialized the confirmation
    */
    function confirm(
        address relay
    )
        public
        onlyEventConfiguration
        eventPending
    {
        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Confirm;

        address[] confirms = getVoters(Vote.Confirm);

        if (confirms.length >= initData.requiredConfirmations) {
            status = EthereumEventStatus.Confirmed;

            notifyEventStatusChanged();
            transferAll(initData.ethereumEventConfiguration);
        }
    }

    /*
        @notice Reject event
        @dev Can be called only by parent event configuration
        @dev Can be called only when event configuration is in Pending status
        @param relay Relay, who initialized the confirmation
    */
    function reject(
        address relay
    )
        public
        onlyEventConfiguration
        eventPending
    {
        require(votes[relay] == Vote.Empty, ErrorCodes.KEY_ALREADY_VOTED);

        votes[relay] = Vote.Reject;

        address[] rejects = getVoters(Vote.Reject);

        if (rejects.length >= initData.requiredRejects) {
            status = EthereumEventStatus.Rejected;

            notifyEventStatusChanged();
            transferAll(initData.ethereumEventConfiguration);
        }
    }

    /*
        @notice Execute callback on proxy contract
        @dev Can be called by anyone
        @dev Can be called only when event is in Confirmed status
        @dev May be called only once
        @dev Require more than 1 TON of attached balance
        @dev Send the attached balance to the event configuration which proxies it to the Proxy
    */
    function executeProxyCallback() public eventConfirmed {
        require(msg.value >= 1 ton, ErrorCodes.TOO_LOW_MSG_VALUE);

        status = EthereumEventStatus.Executed;
        executor = msg.sender;

        notifyEventStatusChanged();

        IProxy(initData.ethereumEventConfiguration).broxusBridgeCallback{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(initData, executor);
    }

    /*
        @notice Get event details
        @returns _initData Init data
        @returns _status Current event status
        @returns _confirmRelays List of relays who have confirmed event
        @returns _confirmRelays List of relays who have rejected event
    */
    function getDetails() public view returns (
        EthereumEventInitData _initData,
        EthereumEventStatus _status,
        address[] confirms,
        address[] rejects,
        uint128 balance,
        address _executor
    ) {
        return (
            initData,
            status,
            getVoters(Vote.Confirm),
            getVoters(Vote.Reject),
            address(this).balance,
            executor
        );
    }

    /*
        @notice Get decoded event data
        @returns rootToken Token root contract address
        @returns tokens How much tokens to mint
        @returns wid Tokens receiver address workchain ID
        @returns owner_addr Token receiver address body
        @returns owner_pubkey Token receiver public key
        @returns owner_address Token receiver address (derived from the wid and owner_addr)
    */
    function getDecodedData() public view returns (
        address rootToken,
        uint128 tokens,
        int8 wid,
        uint256 owner_addr,
        uint256 owner_pubkey,
        address owner_address
    ) {
        (rootToken) = decodeConfigurationMeta(initData.configurationMeta);

        (
            tokens,
            wid,
            owner_addr,
            owner_pubkey
        ) = decodeEthereumEventData(initData.eventData);

        owner_address = address.makeAddrStd(wid, owner_addr);
    }

    /*
        @notice Notify owner contract that event contract status has been changed
        @dev In this example, notification receiver is derived from the configuration meta
        @dev Used to easily collect all confirmed events by user's wallet
    */
    function notifyEventStatusChanged() internal view {
        (,,,,,address owner_address) = getDecodedData();

        if (owner_address.value != 0) {
            IEventNotificationReceiver(owner_address)
                .notifyEthereumEventStatusChanged{flag: 0, bounce: false}(status);
        }
    }

    /*
        @notice Bounce handler
        @dev Used in case something went wrong in the Proxy callback and switch status back to Confirmed
    */
    onBounce(TvmSlice body) external {
        uint32 functionId = body.decode(uint32);
        if (functionId == tvm.functionId(IProxy.broxusBridgeCallback)) {
            if (msg.sender == initData.proxyAddress && status == EthereumEventStatus.Executed) {
                status = EthereumEventStatus.Confirmed;
                notifyEventStatusChanged();
                executor.transfer({ flag: 128, value: 0 });
            }
        }
    }
}
