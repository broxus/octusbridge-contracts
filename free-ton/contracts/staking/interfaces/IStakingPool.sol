pragma ton-solidity ^0.39.0;
pragma AbiHeader expire;

interface IStakingPool {
    function finishDeposit(uint64 _nonce) external;
    function finishWithdraw(address user, uint128 withdrawAmount, address send_gas_to) external;
    function revertDeposit(uint64 _nonce) external;
}
