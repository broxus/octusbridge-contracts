# Update Bridge configuration

It possible that relays want to update the Bridge configuration params or pause / unpause it.
To do this, they vote on the TON Bridge and, if update confirmed, transfer the proofs to the Ethereum Bridge.

## Pipeline

1. One of relays calls the `updateBridgeConfiguration`. The parameters are:
    1. `BridgeConfiguration _bridgeConfiguration` - new Bridge configuration.
    2. `Vote _vote` - vote structure. Contains the `signature` - `_bridgeConfiguration` signature with relay's Ethereum key.
2. Some relays may call the `updateBridgeConfiguration` with `_vote.signature: ''`, which means reject update
    1. If update collects required amount of rejects first, the update removes from the Bridge storage
3. Some relays may call the `updateBridgeConfiguration` with non-empty `_vote.signature`, which means confirm update
    1. If update collects required amount of confirmations first, the update comes into force.
    2. Than it removes from the Bridge storage
4. Anyone can encode `bridgeConfiguration` for Ethereum Bridge, take the list of signatures and call the Ethereum Bridge

TODO: add method signature

