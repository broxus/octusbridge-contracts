pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import '@broxus/contracts/contracts/libraries/MsgFlag.sol';


import "./../../interfaces/multivault/IMultiVaultEVMEventAlien.sol";
import "./../../interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol";
import "./../../interfaces/IProxyExtended.sol";
import "./../../interfaces/multivault/IProxyMultiVaultAlien_V3.sol";
import "./../../interfaces/ITokenRootAlienEVM.sol";
import "./../../interfaces/alien-token-merge/IMergePool.sol";
import "./../../interfaces/alien-token-merge/IMergeRouter.sol";

import "./../base/EthereumBaseEvent.sol";


/// @title Alien event EVM -> Everscale
/// @notice Leads to minting some TIP3 representation of ERC20 token
/// Multiple scenarios are implemented
/// - Corresponding TIP3 token is not deployed
/// - Merge router is not deployed
/// - Merge router corresponds to some merge pool
contract MultiVaultEVMEventAlien is EthereumBaseEvent, IMultiVaultEVMEventAlien {
    uint128 constant POWER_BASE = 10;

    uint256 base_chainId;
    uint160 base_token;
    string name;
    string symbol;
    uint8 decimals;
    uint128 amount;
    address recipient;

    address proxy;
    address token;

    address router;
    address pool;
    address canon;

    address target_token;
    uint128 target_amount;

    constructor(
        address _initializer,
        TvmCell _meta
    ) EthereumBaseEvent(_initializer, _meta) public {}

    function afterSignatureCheck(
        TvmSlice body,
        TvmCell
    ) private inline view returns (TvmSlice) {
        body.decode(uint64, uint32);
        TvmSlice bodyCopy = body;
        uint32 functionId = body.decode(uint32);

        if (isExternalVoteCall(functionId)) {
            require(votes[msg.pubkey()] == Vote.Empty, ErrorCodes.KEY_VOTE_NOT_EMPTY);
        }

        return bodyCopy;
    }

    function onInit() override internal {
        setStatusInitializing();

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

        IEthereumEventConfiguration(eventInitData.configuration).getDetails{
            value: 1 ton,
            callback: MultiVaultEVMEventAlien.receiveConfigurationDetails
        }();
    }

    function receiveConfigurationDetails(
        IEthereumEventConfiguration.BasicConfiguration,
        IEthereumEventConfiguration.EthereumEventConfiguration _networkConfiguration,
        TvmCell
    ) external override {
        require(msg.sender == eventInitData.configuration);

        proxy = _networkConfiguration.proxy;

        IProxyMultiVaultAlien_V3(proxy).deriveAlienTokenRoot{
            value: 1 ton,
            callback: MultiVaultEVMEventAlien.receiveAlienTokenRoot
        }(
            base_chainId,
            base_token,
            name,
            symbol,
            decimals
        );
    }

    /// @notice Receives the alien token root address
    /// Can be called only by `proxy`
    /// @dev Sends the request to token to ensure it's already deployed
    /// In case it's not - bounced message will be received, see `onBounce`
    function receiveAlienTokenRoot(
        address token_
    ) external override {
        require(msg.sender == proxy);

        token = token_;

        ITokenRootAlienEVM(token).meta{
            value: 1 ton,
            bounce: true,
            callback: MultiVaultEVMEventAlien.receiveTokenMeta
        }();
    }

    /// @notice Receives token meta from the token, to ensure it's already deployed
    /// Can be called only by `token`
    /// @dev Sends request to the proxy to receive merge router address
    function receiveTokenMeta(
        uint256, // base_chainId_
        uint160, // base_token_
        string, // name
        string, // symbol
        uint8 // decimals
    ) external override {
        require(msg.sender == token);

        _requestMergeRouter();
    }

    function _requestMergeRouter() internal view {
        // Token exists, no need to deploy
        // Ask the router address
        IProxyMultiVaultAlien_V3(proxy).deriveMergeRouter{
            value: 1 ton,
            bounce: false,
            callback: MultiVaultEVMEventAlien.receiveMergeRouter
        }(token);
    }

    /// @notice Receives merge router address
    /// Can be called only by `proxy`
    /// @dev Sends request to the merge router to receive pool address
    /// In case merge router is not deployed yet - the onBounce message will be received
    /// @param router_ Router address
    function receiveMergeRouter(
        address router_
    ) external override {
        require(msg.sender == proxy);

        router = router_;

        // Request merge router pool
        IMergeRouter(router).getPool{
            value: 1 ton,
            bounce: true,
            callback: MultiVaultEVMEventAlien.receiveMergeRouterPool
        }();
    }

    /// @notice Receives merge pool address
    /// Can be called only by `router`
    /// @dev In case pool is zero address - then finish transfer with `token` and `amount`
    /// Otherwise - request canon token from the pool
    /// @param pool_ Pool address
    function receiveMergeRouterPool(
        address pool_
    ) external override {
        require(msg.sender == router);

        pool = pool_;

        if (pool.value == 0) {
            _finishSetup(token, amount);
        } else {
            IMergePool(pool).getCanon{
                value: 1 ton,
                bounce: false,
                callback: MultiVaultEVMEventAlien.receiveMergePoolCanon
            }();
        }
    }

    /// @notice Receives merge pool canon
    /// @dev Canon token can be disabled, in this case user receives `token`
    /// @param canon_ Canon token address
    /// @param canonToken_ Canon token
    function receiveMergePoolCanon(
        address canon_,
        IMergePool.Token canonToken_
    ) external override {
        require(msg.sender == pool);

        canon = canon_;

        if (canonToken_.enabled == false) {
            // Canon token specified but not enabled
            // fallback to the `token`

            _finishSetup(token, amount);
        } else {
            // Canon token specified and enabled

            uint128 canon_amount;

            if (decimals > canonToken_.decimals) {
                canon_amount = amount / (POWER_BASE**(decimals - canonToken_.decimals));
            } else if (decimals < canonToken_.decimals) {
                canon_amount = amount * (POWER_BASE**(canonToken_.decimals - decimals));
            } else {
                canon_amount = amount;
            }

            // In case the token decimals is more than canon decimals
            // And the transferred amount is too low
            // The canon_amount may be equal to zero. In this case - mints user the original token
            if (canon_amount == 0) {
                _finishSetup(token, amount);
            } else {
                _finishSetup(canon, canon_amount);
            }
        }
    }

    function onConfirm() internal override {
        TvmCell metaData = abi.encode(
            target_token,
            target_amount,
            recipient
        );

        IProxyExtended(eventInitData.configuration).onEventConfirmedExtended{
            flag: MsgFlag.ALL_NOT_RESERVED
        }(eventInitData, metaData, initializer);
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
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS}(
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

    // TODO: legacy decoded data?
    function getDecodedDataExtended() external override responsible returns(
        uint256 base_chainId_,
        uint160 base_token_,
        string name_,
        string symbol_,
        uint8 decimals_,
        uint128 amount_,
        address recipient_,
        address proxy_,
        address token_,
        address router_,
        address pool_,
        address canon_,
        address target_token_,
        uint128 target_amount_
    ) {
        return {value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS}(
            base_chainId,
            base_token,
            name,
            symbol,
            decimals,
            amount,
            recipient,
            proxy,
            token,
            router,
            pool,
            canon,
            target_token,
            target_amount
        );
    }

    onBounce(TvmSlice slice) external {
        uint32 selector = slice.decode(uint32);

        if (
            selector == tvm.functionId(ITokenRootAlienEVM.meta) &&
            msg.sender == token
        ) {
            // Failed to request token meta
            // Seems like corresponding token root not deployed so deploy it
            IProxyMultiVaultAlien_V3(proxy).deployAlienToken{
                value: 2 ton,
                bounce: false
            }(
                base_chainId,
                base_token,
                name,
                symbol,
                decimals,
                recipient // TODO: recipient or event contracts
            );

            _requestMergeRouter();
        } else if (
            selector == tvm.functionId(IMergeRouter.getPool) &&
            msg.sender == router
        ) {
            // Failed to request router's pool
            // Seems like corresponding router not deployed so deploy it
            IProxyMultiVaultAlien_V3(proxy).deployMergeRouter{
                value: 1 ton,
                bounce: false
            }(token);

            _finishSetup(token, amount);
        }
    }

    function _finishSetup(
        address _target_token,
        uint128 _target_amount
    ) internal {
        target_token = _target_token;
        target_amount = _target_amount;

        loadRelays();
    }
}
