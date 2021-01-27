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

- `bridgeUpdateRequiredConfirmations` - How much confirmations needs to perform any action proposal
- `bridgeUpdateRequiredRejects` - How much rejects needs to reject any action proposal
