# Initialize Bridge

To initialize new Bridge, two smart contracts need to be deployed:

- [Bridge contract in Ethereum blockchain](./../ethereum/contracts/Bridge.sol)
- [Bridge contract in TON blockchain](./../free-ton/contracts/Bridge.sol)

Ethereum Bridge requires only list of addresses of Ethereum relays. TON Bridge requires more options:

- List of TON relays public keys
- List of Ethereum relays addresses (should be same as in the Ethereum bridge)
- Initial configuration of the Bridge

Initial configuration parameters are available in the [IBridge.sol](./../free-ton/contracts/interfaces/IBridge.sol).
It contains:

- `bridgeConfigurationUpdateRequiredConfirmations` - How much confirmations needs to confirm the Bridge configuration update
- `bridgeConfigurationUpdateRequiredRejects` - How much rejects needs to reject the update
- `bridgeRelayUpdateRequiredConfirmations` - How much confirmations needs to confirm the adding / removing relay from the Bridge
- `bridgeRelayUpdateRequiredRejects` - How much rejects needs to reject it
- `eventConfigurationRequiredConfirmations` - How much confirmations needs to activate new event configuration or update the existing one
- `eventConfigurationRequiredRejects` - How much rejects needs to reject the activation or update
