// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;


interface IVault {
    struct TONAddress {
        int128 wid;
        uint256 addr;
    }

    function saveWithdraw(
        bytes32 id,
        address recipient,
        uint256 amount,
        uint256 bounty
    ) external;

    function deposit(
        address sender,
        TONAddress calldata recipient,
        uint256 _amount,
        address pendingWithdrawalToFill
    ) external;

    function configuration() external view returns(TONAddress memory _configuration);
    function bridge() external view returns(address);
    function apiVersion() external view returns(string memory api_version);

    function initialize(
        address _token,
        address _governance,
        address _bridge,
        address wrapper,
        address guardian,
        address management
    ) external;

    function governance() external view returns(address);
    function token() external view returns(address);
}
