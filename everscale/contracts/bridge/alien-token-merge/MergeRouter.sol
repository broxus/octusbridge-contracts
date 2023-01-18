pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;


import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/libraries/MsgFlag.sol';
import "./../../utils/TransferUtils.sol";
import "../interfaces/alien-token-merge/IMergeRouter.sol";


contract MergeRouter is IMergeRouter, InternalOwner, TransferUtils {
    address static proxy;
    address static token;

    address pool;
    address public manager;

    modifier onlyOwnerOrManager() {
        require(msg.sender == owner || msg.sender == manager);

        _;
    }

    constructor(
        address _owner,
        address _manager
    ) public {
        require(msg.sender == proxy);

        manager = _manager;

        setOwnership(_owner);
    }

    /// @notice Set pool address. Cant be zero address.
    /// Can be called only by `owner` or `manager`
    /// @param pool_ Pool address
    function setPool(
        address pool_
    ) external override cashBack onlyOwnerOrManager {
        require(pool_.value != 0);

        pool = pool_;
    }

    function setManager(
        address _manager
    ) external override cashBack onlyOwner {
        manager = _manager;
    }

    /// @notice Set pool address to zero address
    /// Can be called only by `owner` or `manager`
    function disablePool() external override cashBack onlyOwnerOrManager {
        pool = address.makeAddrStd(0, 0);
    }

    /// @notice Get pool address
    /// @return Pool address. Zero address if no pool was set.
    function getPool() external override responsible returns (address) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} pool;
    }

    /// @notice Get router details
    function getDetails() external override responsible returns (
        address _proxy,
        address _token,
        address _pool
    ) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (proxy, token, pool);
    }
}
