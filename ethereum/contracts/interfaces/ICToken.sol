pragma solidity ^0.8.0;

interface ICEther {
    function mint() external payable;
    function repayBorrow() external payable;
}


interface ICToken {
    function mint(uint256 mintAmount) external returns (uint256);

    function balanceOf(address owner) view external returns (uint256);

    function balanceOfUnderlying(address owner) external returns (uint256);

    function borrow(uint256 borrowAmount) external returns (uint256);

    function borrowBalanceCurrent(address account) external returns (uint);

    function repayBorrow(uint256 repayAmount) external returns (uint256);

    function redeem(uint256 redeemTokens) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
}
