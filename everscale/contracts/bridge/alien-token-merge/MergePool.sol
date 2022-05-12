pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;


import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';

import "./../../utils/TransferUtils.sol";
import "./../interfaces/alien-token-merge/IMergePool.sol";
import "./../interfaces/multivault/IProxyMultiVaultAlien.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";


contract MergePool is
    IMergePool,
    InternalOwner,
    RandomNonce,
    TransferUtils,
    IAcceptTokensBurnCallback
{
    address static proxy;

    mapping (address => uint8) tokens;
    address public manager;
    address canon;

    modifier tokenExists(address token) {
        require(tokens.exists(token));

        _;
    }

    constructor(
        address[] tokens_,
        uint256 canonId,
        address owner_,
        address manager_
    ) public {
        require(tokens_.length > 0);
        require(msg.sender == proxy);
        require(canonId <= tokens_.length - 1);

        canon = tokens_[canonId];

        setOwnership(owner_);

        manager = manager_;

        // Request decimals for every token
        for (uint i = 0; i < tokens_.length; i++) {
            tokens[tokens_[i]] = 0;

            _requestTokenDecimals(tokens_[i]);
        }
    }

    function receiveTokenDecimals(
        uint8 decimals
    ) external override tokenExists(msg.sender) {
        tokens[msg.sender] = decimals;
    }

    /// @notice Remove token from the pool
    /// Token must be presented in the pool
    /// Token must be different from the canon. Otherwise set new canon first.
    /// Can be called only by `owner`
    /// @param token Token address
    function removeToken(
        address token
    ) external override onlyOwner cashBack {
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
    ) external override onlyOwner {
        require(!tokens.exists(token));

        tokens[token] = 0;

        _requestTokenDecimals(token);
    }

    /// @notice Set `canon` token
    /// Can be called only by `owner`
    /// @param token token address
    function setCanon(
        address token
    ) external override onlyOwner tokenExists(token) cashBack {
        canon = token;
    }

    /// @notice Get canon token
    /// @return Canon token address
    function getCanon() external override responsible returns (address, uint8) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (canon, tokens[canon]);
    }

    /// @notice Get token pools, decimals and canon token
    /// @return _tokens Pool tokens, mapping token => decimals
    /// @return _canon Canon token
    function getTokens() external override responsible returns(
        mapping(address => uint8) _tokens,
        address _canon
    ) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (tokens, canon);
    }

    /// @notice Callback for accepting tokens burn
    /// Burned token must be presented in the pool, otherwise tokens will be lost
    /// `payload` contains cell encoded (address targetToken). Target token must be
    /// presented in the pool, otherwise tokens will be lost.
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

        require(tokens.exists(targetToken));

        uint128 amount = _convertDecimals(
            _amount,
            msg.sender,
            targetToken
        );

        if (burnType == BurnType.Swap) {
            IProxyMultiVaultAlien(proxy).mintTokensByMergePool{
                bounce: false,
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(
                _randomNonce,
                targetToken,
                amount,
                walletOwner,
                remainingGasTo
            );
        } else {
            (uint160 recipient) = abi.decode(operationPayload, (uint160));

            IProxyMultiVaultAlien(proxy).withdrawTokensByMergePool{
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
            value: 0.3 ton,
            bounce: false,
            callback: MergePool.receiveTokenDecimals
        }();
    }

    function _convertDecimals(
        uint128 amount,
        address from_,
        address to_
    ) internal view returns (uint128) {
        uint8 from_decimals = tokens[from_];
        uint8 to_decimals = tokens[to_];

        uint128 base = 10;

        if (from_decimals == to_decimals) {
            return amount;
        } else if (from_decimals > to_decimals) {
            return amount / (base ** uint128(from_decimals - to_decimals));
        } else {
            return amount / (base ** uint128(to_decimals - from_decimals));
        }
    }
}
