pragma ton-solidity >= 0.39.0;

import "./IProxyMultiVaultAlien_V1.sol";
import "../../IEVMCallback.sol";


interface IProxyMultiVaultAlien_V4 is IProxyMultiVaultAlien_V1, IEVMCallback {
    function mintTokensByMergePool(
        uint nonce,
        address token,
        uint128 amount,
        address recipient,
        address remainingGasTo,
        TvmCell payload
    ) external;

    function withdrawTokensByMergePool(
        uint nonce,
        address token,
        uint128 amount,
        uint160 recipient,
        address remainingGasTo,
        EVMCallback callback
    ) external;

    function deriveMergeRouter(
        address token
    ) external responsible returns (address);

    function deployMergeRouter(
        address token
    ) external;

    function deriveMergePool(
        uint256 nonce
    ) external responsible returns (address);

    function deployMergePool(
        uint256 nonce,
        address[] tokens,
        uint256 canonId
    ) external;

    function setManager(
        address _manager
    ) external;

    function setMergePool(
        TvmCell _mergePool
    ) external;

    function setMergeRouter(
        TvmCell _mergeRouter
    ) external;

    function setMergePoolPlatform(
        TvmCell _mergePoolPlatform
    ) external;

    function mint(
        address token,
        uint128 amount,
        address recipient,
        TvmCell payload
    ) external;

    function burn(
        address token,
        uint128 amount,
        address walletOwner
    ) external;

    function setCustomAlien(
        uint256 chainId,
        uint160 token,
        address alien
    ) external;

    function customAlien(
        uint256 chainId,
        uint160 token
    ) external returns(address);

    function upgradeMergePool(
        address pool
    ) external;

    event AlienTransfer(
        uint160 token,
        uint128 amount,
        uint160 recipient,
        uint256 chainId,
        uint160 callback_recipient,
        TvmCell callback_payload,
        bool callback_strict
    );
}
