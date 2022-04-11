pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../../interfaces/multivault/IMultiVaultSolanaEverscaleEventAlien.sol";
import "./../../interfaces/event-configuration-contracts/ISolanaEverscaleEventConfiguration.sol";
import "./../../interfaces/IEthereumEverscaleProxyExtended.sol";
import "./../../interfaces/multivault/IProxyMultiVaultAlien.sol";

import "./../base/SolanaEverscaleBaseEvent.sol";
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


contract MultiVaultSolanaEverscaleEventAlien is SolanaEverscaleBaseEvent, IMultiVaultSolanaEverscaleEventAlien {
    uint256 base_chainId;
    uint160 base_token;
    string name;
    string symbol;
    uint8 decimals;
    uint128 amount;
    address recipient;

    address proxy;
    address token;

    constructor(
        address _initializer,
        TvmCell _meta
    ) SolanaEverscaleBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(
        TvmSlice body,
        TvmCell
    ) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);

        if (isExternalVoteCall(functionId)){
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }

        return bodyCopy;
    }

    function onInit() override internal {
        int8 recipient_wid;
        uint256 recipient_addr;

        (
            base_chainId,
            base_token,
            name,
            symbol,
            decimals,
            amount,
            recipient_wid,
            recipient_addr
        ) = abi.decode(
            eventInitData.voteData.eventData,
            (uint256, uint160, string, string, uint8, uint128, int8, uint256)
        );

        recipient = address.makeAddrStd(recipient_wid, recipient_addr);

        ISolanaEverscaleEventConfiguration(eventInitData.configuration).getDetails{
            value: 1 ton,
            callback: MultiVaultSolanaEverscaleEventAlien.receiveConfigurationDetails
        }();
    }

    function receiveConfigurationDetails(
        ISolanaEverscaleEventConfiguration.BasicConfiguration,
        ISolanaEverscaleEventConfiguration.SolanaEverscaleEventConfiguration _networkConfiguration,
        TvmCell
    ) external override {
        require(msg.sender == eventInitData.configuration);

        proxy = _networkConfiguration.proxy;

        IProxyMultiVaultAlien(proxy).deriveAlienTokenRoot{
            value: 1 ton,
            callback: MultiVaultSolanaEverscaleEventAlien.receiveAlienTokenRoot
        }(
            base_chainId,
            base_token,
            name,
            symbol,
            decimals
        );
    }

    function receiveAlienTokenRoot(
        address token_
    ) external override {
        require(msg.sender == proxy);

        token = token_;

        loadRelays();
    }

    function onConfirm() internal override {
        TvmCell meta = abi.encode(
            token,
            amount,
            recipient
        );

        IEthereumEverscaleProxyExtended(eventInitData.configuration).onEventConfirmedExtended{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, meta, initializer);
    }

    function getDecodedData() external override responsible returns(
        uint256 base_chainId_,
        uint160 base_token_,
        string name_,
        string symbol_,
        uint8 decimals_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address token_
    ) {
        return {value: 0, flag: MsgFlag.REMAINING_GAS}(
            base_chainId,
            base_token,
            name,
            symbol,
            decimals,
            amount,
            recipient,
            proxy,
            token
        );
    }
}
