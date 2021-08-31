pragma solidity ^0.8.0;


contract StakingRelayVerifier {
    event RelayAddressVerified(address eth_addr, uint8 workchain_id, uint256 addr_body);

    function verify_relay_staker_address(uint8 workchain_id, uint256 address_body) external {
        emit RelayAddressVerified(msg.sender, workchain_id, address_body);
    }
}
