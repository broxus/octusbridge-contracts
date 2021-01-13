# TON event proxy specification

TON event proxy is a contract which main purpose is to receive confirmations from Event Configuration contract.

## Pipeline

1. After the Event contract collects enough confirmations it sends the callback to the Event proxy. Callback contains all the data about event.
2. Event proxy [verifies](#validating-event-contract-callback) that the `msg.sender` is a valid Event contract.
3. Event proxy execute callback logic

## Validating Event contract callback

Each Ethereum event corresponds to the separate Event contract in TON blockchain.
They are constantly deployed and their future addresses are unknown in the beggining.
And each of this Event contracts are calling the Event proxy.
Since the callback is sensitive method, you `msg.sender` is Event contract. How it can be done without knowing Event contracts addresses in advance?

The solution is to derive Event contract address and compare it with `msg.sender`. The contract in TON is derived from the following parameters:

- Contract code (Event contract code is known in advance, store it in the Event proxy)
- Public key from the contract creation (also known in advance, store it in the Event proxy)
- Initial data. (sent to the Event proxy on the callback)

So when the Event proxy is receiving the callback, it's building the address from (Event contract code, Event contract deploy pubkey, Event contract init data) and compare it with `msg.sender`.

Why it works? Imagine you've deployed the malicious contract and want to call the Event proxy callback.

## Callback signature

```
function broxusBridgeCallback(
        IEvent.EthereumEventInitData _eventData
    )
```

## Contract example

The example implementation can be found at [EventProxySimple.sol](../free-ton/contracts/additional/EventProxySimple.sol).
