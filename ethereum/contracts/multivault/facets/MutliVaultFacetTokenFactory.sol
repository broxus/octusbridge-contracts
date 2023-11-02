// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;


import "../interfaces/IMultiVaultToken.sol";
import "../MultiVaultToken.sol";


contract MultiVaultFacetTokenFactory {
    string constant public DEFAULT_NAME_LP_PREFIX = 'Venom LP ';
    string constant public DEFAULT_SYMBOL_LP_PREFIX = 'venomLP';

    modifier onlySelfCall() {
        require(msg.sender == address(this), "TokenFactory: not self call");

        _;
    }

    function getInitHash() public pure returns(bytes32) {
        bytes memory bytecode = type(MultiVaultToken).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }

    function getLPToken(
        address token
    ) external view returns (address lp) {
        lp = address(uint160(uint(keccak256(abi.encodePacked(
            hex'ff',
            address(this),
            keccak256(abi.encodePacked('LP', token)),
            hex'192c19818bebb5c6c95f5dcb3c3257379fc46fb654780cb06f3211ee77e1a360' // MultiVaultToken init code hash
        )))));
    }

    /// @notice Gets the address
    /// @param wid Everscale token address workchain id
    /// @param addr Everscale token address body
    /// @return token Token address
    function getNativeToken(
        int8 wid,
        uint256 addr
    ) external view returns (address token) {
        token = address(uint160(uint(keccak256(abi.encodePacked(
            hex'ff',
            address(this),
            keccak256(abi.encodePacked(wid, addr)),
            hex'192c19818bebb5c6c95f5dcb3c3257379fc46fb654780cb06f3211ee77e1a360' // MultiVaultToken init code hash
        )))));
    }

    function deployTokenForNative(
        int8 wid,
        uint256 addr,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) external onlySelfCall returns (address token) {
        bytes memory bytecode = type(MultiVaultToken).creationCode;

        bytes32 salt = keccak256(abi.encodePacked(wid, addr));

        assembly {
            token := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        IMultiVaultToken(token).initialize(name, symbol, decimals);
    }

    function deployLPToken(
        address token
    ) external onlySelfCall returns (address lp) {
        bytes memory bytecode = type(MultiVaultToken).creationCode;

        bytes32 salt = keccak256(abi.encodePacked('LP', token));

        assembly {
            lp := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        string memory name = IERC20Metadata(token).name();
        string memory symbol = IERC20Metadata(token).symbol();
        uint8 decimals = IERC20Metadata(token).decimals();

        IMultiVaultToken(lp).initialize(
            string(abi.encodePacked(DEFAULT_NAME_LP_PREFIX, name)),
            string(abi.encodePacked(DEFAULT_SYMBOL_LP_PREFIX, symbol)),
            decimals
        );
    }

    function mint(
        address token,
        address recipient,
        uint256 amount
    ) external onlySelfCall {
        IMultiVaultToken(token).mint(recipient, amount);
    }

    function burn(
        address token,
        address owner,
        uint256 amount
    ) external onlySelfCall {
        IMultiVaultToken(token).burn(owner, amount);
    }
}