// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.20;

// Not ingerited anyware
// MultiVaultFacetTokenFactory has different pragma solidity (0.8.0)
// Since it depends on not-upgredeable MultiVaultToken
interface IMultiVaultFacetTokenFactory {
    function getLPToken(
        address token
    ) external view returns (address lp);

    function getNativeToken(
        int8 wid,
        uint256 addr
    ) external view returns (address token);

    function deployTokenForNative(
        int8 wid,
        uint256 addr,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) external returns (address token);

    function deployLPToken(
        address token
    ) external returns (address lp);

    function mint(
        address token,
        address recipient,
        uint256 amount
    ) external;

    function burn(
        address token,
        address owner,
        uint256 amount
    ) external;
}