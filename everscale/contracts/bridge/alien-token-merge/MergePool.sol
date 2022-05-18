pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;


import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

import "./../../utils/TransferUtils.sol";
import "./../interfaces/alien-token-merge/IMergePool.sol";
import "./../interfaces/multivault/IProxyMultiVaultAlien_V3.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";


/// @title Merge pool contract
/// Basically allows to swap different alien tokens on 1:1 ratio
/// Must be deployed by the ProxyMultiVaultAlien
contract MergePool is
    IMergePool,
    InternalOwner,
    RandomNonce,
    TransferUtils,
    IAcceptTokensBurnCallback
{
    uint128 constant ATTACH_TO_DECIMALS_REQUEST = 0.3 ton;

    address static proxy;

    uint8 public version;

    mapping (address => Token) tokens;
    address public manager;
    address canon;

    modifier tokenExists(address token) {
        require(tokens.exists(token));

        _;
    }

    modifier onlyOwnerOrManager() {
        require(msg.sender == owner || msg.sender == manager);

        _;
    }

    modifier onlyProxy() {
        require(msg.sender == proxy);

        _;
    }

    constructor() public {
        revert();
    }

    function acceptUpgrade(
        TvmCell code,
        uint8 newVersion
    ) external override onlyProxy {
        if (version == newVersion) return;

        TvmCell data = abi.encode(
            proxy,
            _randomNonce,
            newVersion,
            tokens,
            canon,
            owner,
            manager
        );

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(data);
    }

    function onCodeUpgrade(
        TvmCell data
    ) private {
        tvm.resetStorage();

        (
            address proxy_,
            uint256 _randomNonce_,
            uint8 version_,
            address[] tokens_,
            uint256 canonId,
            address owner_,
            address manager_
        ) = abi.decode(
            data,
            (address, uint256, uint8, address[], uint256, address, address)
        );

        proxy = proxy_;
        _randomNonce = _randomNonce_;
        version = version_;

        require(tokens_.length > 0);
        require(msg.sender == proxy);
        require(canonId <= tokens_.length - 1);

        canon = tokens_[canonId];

        setOwnership(owner_);

        manager = manager_;

        // Request decimals for every token
        for (address token: tokens_) {
            tokens[token] = Token({
                decimals: 0,
                enabled: false
            });

            _requestTokenDecimals(token);
        }
    }

    function receiveTokenDecimals(
        uint8 decimals
    ) external override tokenExists(msg.sender) {
        tokens[msg.sender].decimals = decimals;
    }

    function setManager(
        address _manager
    ) external override onlyOwner cashBack {
        manager = _manager;
    }

    /// @notice Remove token from the pool
    /// Token must be presented in the pool
    /// Token must be different from the canon. Otherwise set new canon first.
    /// Can be called only by `owner`
    /// @param token Token address
    function removeToken(
        address token
    ) external override onlyOwnerOrManager cashBack {
        require(tokens.exists(token));
        require(token != canon);

        delete tokens[token];
    }

    /// @notice Add new token to the pool
    /// Token must not be presented in the pool
    /// Can be called only by `owner`
    /// @param token Token address
    function addToken(
        address token
    ) external override onlyOwnerOrManager {
        require(!tokens.exists(token));

        tokens[token] = Token({
            decimals: 0,
            enabled: false
        });

        _requestTokenDecimals(token);
    }

    /// @notice Set `canon` token
    /// Can be called only by `owner`
    /// @param token token address
    function setCanon(
        address token
    ) external override onlyOwnerOrManager tokenExists(token) cashBack {
        require(tokens[token].enabled);

        canon = token;
    }

    /// @notice Enable token
    /// Can be called only by `owner`
    /// Token must be presented in the pool
    /// @param token Token address
    function enableToken(
        address token
    ) public override onlyOwnerOrManager cashBack {
        _setTokenStatus(token, true);
    }

    function enableAll() external override onlyOwnerOrManager cashBack {
        for ((address token,): tokens) {
            _setTokenStatus(token, true);
        }
    }

    /// @notice Disable token
    /// Can be called only by `owner`
    /// Token must be presented in the pool
    /// Users cant swap tokens to the disabled tokens
    /// @param token Token address
    function disableToken(
        address token
    ) public override onlyOwnerOrManager cashBack {
        _setTokenStatus(token, false);
    }

    function disableAll() external override onlyOwnerOrManager cashBack {
        for ((address token,): tokens) {
            _setTokenStatus(token, false);
        }
    }

    /// @notice Get canon token
    /// @return Canon token address
    function getCanon() external override responsible returns (address, Token) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (canon, tokens[canon]);
    }

    /// @notice Get token pools, decimals and canon token
    /// @return _tokens Pool tokens, mapping token => decimals
    /// @return _canon Canon token
    function getTokens() external override responsible returns(
        mapping(address => Token) _tokens,
        address _canon
    ) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (tokens, canon);
    }

    /// @notice Callback for accepting tokens burn
    /// Burned token must be presented in the pool, otherwise tokens will be lost
    /// @param payload Contains cell encoded (BurnType, targetToken, operationPayload)
    /// Operation payload depends on the requested operation
    /// - For swap, operation payload is empty cell
    /// - For withdraw, operation payload in (uint160 recipient)
    function onAcceptTokensBurn(
        uint128 _amount,
        address walletOwner,
        address,
        address remainingGasTo,
        TvmCell payload
    ) external override tokenExists(msg.sender) reserveBalance {
        (
            BurnType burnType,
            address targetToken,
            TvmCell operationPayload
        ) = abi.decode(payload, (BurnType, address, TvmCell));

        uint128 amount = _convertDecimals(
            _amount,
            msg.sender,
            targetToken
        );

        if (tokens[targetToken].enabled == false || tokens[msg.sender].enabled == false) {
            // Target token exists in the merge pool but not enabled yet
            // Or burned token is disabled
            // Mint back burned tokens
            _mintTokens(msg.sender, _amount, walletOwner, remainingGasTo);
        } else if (amount == 0) {
            // Target token enabled but amount is zero, after conversation to the target decimals
            // Mint back burned tokens
            _mintTokens(msg.sender, _amount, walletOwner, remainingGasTo);
        } else if (burnType == BurnType.Swap) {
            // Target token enabled and swap requested
            // Mint specified token and amount, normalized by decimals
            _mintTokens(targetToken, amount, walletOwner, remainingGasTo);
        } else {
            // Target token enabled and bridge withdraw requested
            // Request withdraw on the bridge
            (uint160 recipient) = abi.decode(operationPayload, (uint160));

            IProxyMultiVaultAlien_V3(proxy).withdrawTokensByMergePool{
                bounce: false,
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(
                _randomNonce,
                targetToken,
                amount,
                recipient,
                remainingGasTo
            );
        }
    }

    function _requestTokenDecimals(address token) internal pure {
        ITokenRoot(token).decimals{
            value: ATTACH_TO_DECIMALS_REQUEST,
            bounce: false,
            callback: MergePool.receiveTokenDecimals
        }();
    }

    function _mintTokens(
        address token,
        uint128 amount,
        address walletOwner,
        address remainingGasTo
    ) internal view {
        IProxyMultiVaultAlien_V3(proxy).mintTokensByMergePool{
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            _randomNonce,
            token,
            amount,
            walletOwner,
            remainingGasTo
        );
    }

    function _convertDecimals(
        uint128 amount,
        address from_,
        address to_
    ) internal view returns (uint128) {
        uint8 from_decimals = tokens[from_].decimals;
        uint8 to_decimals = tokens[to_].decimals;

        uint128 base = 10;

        if (from_decimals == to_decimals) {
            return amount;
        } else if (from_decimals > to_decimals) {
            return amount / (base ** uint128(from_decimals - to_decimals));
        } else {
            return amount * (base ** uint128(to_decimals - from_decimals));
        }
    }

    function _setTokenStatus(address token, bool status) internal {
        require(tokens.exists(token));

        if (status == true) {
            require(tokens[token].decimals > 0);
        }

        tokens[token].enabled = status;
    }
}
