// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;


interface IMultiVaultFacetLiquidity {
    struct Liquidity {
        uint activation;
        uint supply;
        uint cash;
        uint interest;
    }

    function mintLP(
        address token,
        uint amount,
        address recipient
    ) external;

    function redeemLP(
        address token,
        uint amount,
        address recipient
    ) external;

    function exchangeRateCurrent(
        address token
    ) external view returns(uint);

    function getCash(
        address token
    ) external view returns(uint);

    function getSupply(
        address token
    ) external view returns(uint);

    function setTokenInterest(
        address token,
        uint interest
    ) external;

    function setDefaultInterest(
        uint interest
    ) external;

    function liquidity(
        address token
    ) external view returns (Liquidity memory);

    function convertLPToUnderlying(
        address token,
        uint amount
    ) external view returns (uint);

    function convertUnderlyingToLP(
        address token,
        uint amount
    ) external view returns (uint);
}
