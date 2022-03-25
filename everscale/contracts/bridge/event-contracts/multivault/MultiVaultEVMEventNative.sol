pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";

import "./../../interfaces/multivault/IMultiVaultEVMEventNative.sol";
import "./../../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";
import "./../../interfaces/IProxy.sol";

import "./../base/EthereumBaseEvent.sol";


contract MultiVaultEVMEventNative is EthereumBaseEvent, IMultiVaultEVMEventNative {
    address token;
    uint128 amount;
    address recipient;

    address proxy;
    address tokenWallet;

    constructor(
        address _initializer,
        TvmCell _meta
    ) EthereumBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(TvmSlice body, TvmCell /*message*/) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);
        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }
        return bodyCopy;
    }

    function onInit() override internal {
        int8 token_wid;
        uint256 token_addr;

        int8 recipient_wid;
        uint256 recipient_addr;

        (
            token_wid,
            token_addr,
            amount,
            recipient_wid,
            recipient_addr
        ) = abi.decode(
            eventInitData.voteData.eventData,
            (int8, uint256, uint128, int8, uint256)
        );

        token = address.makeAddrStd(token_wid, token_addr);
        recipient = address.makeAddrStd(recipient_wid, recipient_addr);

        IEthereumEventConfiguration(eventInitData.configuration).getDetails{
            value: 1 ton,
            callback: MultiVaultEVMEventNative.receiveConfigurationDetails
        }();
    }

    function receiveConfigurationDetails(
        IEthereumEventConfiguration.BasicConfiguration,
        IEthereumEventConfiguration.EthereumEventConfiguration _networkConfiguration,
        TvmCell
    ) external override {
        require(msg.sender == eventInitData.configuration);

        proxy = _networkConfiguration.proxy;

        ITokenRoot(token).walletOf{
            value: 0.1 ton,
            callback: MultiVaultEVMEventNative.receiveProxyTokenWallet
        }(proxy);
    }

    function receiveProxyTokenWallet(
        address tokenWallet_
    ) external override {
        require(msg.sender == token);

        tokenWallet = tokenWallet_;

        status = Status.Pending;

        loadRelays();
    }

    function getDecodedData() external override responsible returns(
        address token_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address tokenWallet_
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            token,
            amount,
            recipient,
            proxy,
            tokenWallet
        );
    }

    function onConfirm() internal override {
        TvmCell meta = abi.encode(
            tokenWallet,
            amount,
            recipient
        );

        IProxy(eventInitData.configuration).onEventConfirmed{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, meta, initializer);
    }
}