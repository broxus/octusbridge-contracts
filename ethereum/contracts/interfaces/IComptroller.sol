pragma solidity ^0.8.0;

interface IComptroller {
    function enterMarkets(address[] calldata cTokens) external returns (uint256[] memory);

    function markets(address cTokenAddress) external view returns (bool, uint);

    function getAccountLiquidity(address account) external view returns (uint, uint, uint);

    function claimComp(address holder) external;
}
