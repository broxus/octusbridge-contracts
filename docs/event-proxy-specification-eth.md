# Ethereum event proxy specification

Ethereum event proxy is contract, which main purpose is to receive a callbacks with an event structure, which happened in the TON blockchain. And a list of signatures for this structure.

## Recommended pipeline

1. Event happens in TON blockchain
2. Relays encode event data (tx, index, event data itself, etc) and sign it with their Ethereum keys
3. Someone takes the (encoded event data, list of signatures) and call the event proxy callback.
4. Event proxy validate that the signatures are valid
5. Event proxy communicate with Bridge contract to verify that the signers are actual relays
6. Event proxy perform some [replay-protection](#replay-protection)
7. Event proxy consider that the received data is valid and execute some logic

## Replay protection

Anyone can take an encoded event data and list of signatures, and try to call callback twice.
Since the signatures are valid, it may lead to an unexpected behaviour.
The protection may be different, the simple one - store map of hashes of previously used event data, so it can't be sent twice.

## Callback signature

The only required function is the callback.

TODO: add callback details

## Contract example

The example implementation can be found at [EventProxySimple.sol](../ethereum/contracts/examples/EventProxySimple.sol).
