# Update Bridge relay set

It possible that relays want to add new relay and remove existing.
To do this, they vote on the TON Bridge and, if update confirmed, transfer the proofs to the Ethereum Bridge.

## Pipeline

1. One of relays calls the `updateBridgeRelays`. The parameters are:
    1. `BridgeRelay target` - target structure, contains relay TON public key, Ethereum address and action - add or remove
    2. `Vote _vote` - vote structure. Contains the `signature` - `target` signature with relay's Ethereum key.
2. Some relays may call the `updateBridgeRelays` with `_vote.signature: ''`, which means reject relay update
    1. If update collects required amount of rejects first, the update removes from the Bridge storage
3. Some relays may call the `updateBridgeRelays` with non-empty `_vote.signature`, which means confirm update
    1. If update collects required amount of confirmations first, the update comes into force.
    2. Than it removes from the Bridge storage
4. Anyone can encode `target` for Ethereum Bridge, take the list of signatures and call the Ethereum Bridge

TODO: add method signature
