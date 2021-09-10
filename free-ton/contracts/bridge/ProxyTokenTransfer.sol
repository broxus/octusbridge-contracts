pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../utils/ErrorCodes.sol";
import "../utils/cell-encoder/CellEncoder.sol";
import "../utils/TransferUtils.sol";

import "./interfaces/IProxy.sol";
import "./interfaces/IProxyTokenTransferConfigurable.sol";
import "./interfaces/event-configuration-contracts/ITonEventConfiguration.sol";

import "../token/interfaces/IPausedCallback.sol";
import "../token/interfaces/IPausable.sol";
import "../token/interfaces/IBurnTokensCallback.sol";
import "../token/interfaces/IRootTokenContract.sol";
import "../token/interfaces/ISendSurplusGas.sol";
import "../token/interfaces/ITransferOwner.sol";

import './../../../node_modules/@broxus/contracts/contracts/access/InternalOwner.sol';
import './../../../node_modules/@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol';
import "../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";

/// @title Proxy for cross chain token transfers
/// @dev In case of ETH-TON token transfer, this proxy should receive
/// callback from the corresponding EthereumEventConfiguration. After that it mints
/// the specified amount of tokens to the user.
/// In case of TON-ETH token transfer, this proxy should receive burn callback from the token
/// and emit TokenBurn event, which will be signed and then sent to the corresponding EVM network
contract ProxyTokenTransfer is
    IProxy,
    IProxyTokenTransferConfigurable,
    IPausable,
    IBurnTokensCallback,
    RandomNonce,
    CellEncoder,
    InternalOwner,
    TransferUtils,
    CheckPubKey
{
    event Withdraw(int8 wid, uint256 addr, uint128 tokens, uint160 eth_addr, uint32 chainId);

    Configuration config;
    uint128 burnedCount;
    bool paused = false;

    modifier onlyEthereumConfiguration() {
        require(isArrayContainsAddress(config.ethereumConfigurations, msg.sender), ErrorCodes.NOT_ETHEREUM_CONFIG);
        _;
    }

    constructor(address owner_) public checkPubKey {
        tvm.accept();

        setOwnership(owner_);
    }

    function broxusBridgeCallback(
        IEthereumEvent.EthereumEventInitData eventData,
        address gasBackAddress
    ) public override onlyEthereumConfiguration reserveBalance {
        require(!paused, ErrorCodes.PROXY_PAUSED);
        require(config.tokenRoot.value != 0, ErrorCodes.PROXY_TOKEN_ROOT_IS_EMPTY);

        (
            uint128 tokens,
            int8 wid,
            uint256 owner_addr,
            uint256 owner_pubkey
        ) = decodeEthereumEventData(eventData.voteData.eventData);

        address owner_address = address.makeAddrStd(wid, owner_addr);

        require(tokens > 0, ErrorCodes.WRONG_TOKENS_AMOUNT_IN_PAYLOAD);
        require((owner_pubkey != 0 && owner_address.value == 0) ||
                (owner_pubkey == 0 && owner_address.value != 0), ErrorCodes.WRONG_OWNER_IN_PAYLOAD);

        IRootTokenContract(config.tokenRoot).deployWallet{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
            tokens,
            config.settingsDeployWalletGrams,
            owner_pubkey,
            owner_address,
            gasBackAddress
        );
    }

    function burnCallback(
        uint128 tokens,
        TvmCell payload,
        uint256 sender_public_key,
        address sender_address,
        address,
        address send_gas_to
    ) public override reserveBalance {
        if (config.tokenRoot == msg.sender) {
            burnedCount += tokens;
            (
                uint160 ethereumAddress,
                uint32 chainId
            ) = payload.toSlice().decode(uint160, uint32);

//            emit Withdraw(
//                sender_address.wid,
//                sender_address.value,
//                tokens,
//                ethereumAddress,
//                chainId
//            );

            TvmCell eventData = encodeTonEventData(
                sender_address.wid,
                sender_address.value,
                tokens,
                ethereumAddress,
                chainId
            );
            ITonEvent.TonEventVoteData eventVoteData = ITonEvent.TonEventVoteData(tx.timestamp, now, eventData);
            ITonEventConfiguration(config.tonConfiguration).deployEvent{
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(eventVoteData);
        } else {
            if (isArrayContainsAddress(config.outdatedTokenRoots, msg.sender)) {
                IRootTokenContract(config.tokenRoot).deployWallet{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                    tokens,
                    config.settingsDeployWalletGrams,
                    sender_public_key,
                    sender_address,
                    send_gas_to
                );
            } else {
                send_gas_to.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED});
            }
        }
    }

    /*******************
    * Getter functions *
    *******************/

    function getDetails() public view responsible returns (Configuration, address, uint128, bool) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (config, owner, burnedCount, paused);
    }

    function getTokenRoot() public view responsible returns (address) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} config.tokenRoot;
    }

    function getConfiguration() override public view responsible returns (Configuration) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} config;
    }

    /******************
    * Owner functions *
    ******************/

    function setConfiguration(
        Configuration _config,
        address gasBackAddress
    ) override public onlyOwner cashBackTo(gasBackAddress) {
        config = _config;
    }

    function withdrawExtraGasFromTokenRoot(
        address root,
        address to
    ) public pure onlyOwner reserveBalance {
        ISendSurplusGas(root).sendSurplusGas{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(to);
    }

    function transferTokenOwnership(
        address target,
        uint256 external_owner_pubkey_,
        address internal_owner_address_
    ) external pure onlyOwner reserveBalance {
        ITransferOwner(target).transferOwner{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(external_owner_pubkey_, internal_owner_address_);
    }

    function setPaused(bool value) public override onlyOwner reserveBalance {
        paused = value;
        IPausable(config.tokenRoot).setPaused{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(paused);
    }

    function sendPausedCallbackTo(uint64 callback_id, address callback_addr) public override reserveBalance {
        IPausedCallback(callback_addr).pausedCallback{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(callback_id, paused);
    }

    function isArrayContainsAddress(address[] array, address searchElement) private pure returns (bool){
        for (address value: array) {
            if (searchElement == value) {
                return true;
            }
        }
        return false;
    }
}
