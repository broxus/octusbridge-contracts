pragma ton-solidity >= 0.39.0;

import "./IProxyMultiVaultAlien_V1.sol";


interface IProxyMultiVaultAlien_V3 is IProxyMultiVaultAlien_V1 {
    function mintTokensByMergePool(
        uint nonce,
        address token,
        uint128 amount,
        address recipient,
        address remainingGasTo
    ) external;

    function withdrawTokensByMergePool(
        uint nonce,
        address token,
        uint128 amount,
        uint160 recipient,
        address remainingGasTo
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
        address recipient
    ) external;

    function burn(
        address token,
        uint128 amount,
        address walletOwner
    ) external;

    function upgradeMergePool(
        address pool
    ) external;

    event AlienTransfer(
        uint160 token,
        uint128 amount,
        uint160 recipient,
        uint256 chainId
    );
}
