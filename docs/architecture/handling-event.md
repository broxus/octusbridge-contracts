# Handling events

After the event configuration is activated, relays should start to monitor corresponding events emitting.

## TON event pipeline

1. One of relays calls the `confirmTonEvent` Bridge method.
    1. The parameters are:
        1. `IEvent.TonEventInitData eventInitData` - event data
        2. `bytes eventDataSignature` - event data signature, made with relay's Ethereum key
        3. `uint configurationID` - Corresponding event configuration ID
    2. Bridge send the message to the event configuration contract by calling the `confirmEvent` method.
    The parameters are the same plus relay public key.
    3. Event configuration receives the Bridge message
        1. If the `eventInitData` not met before - new Event contract is deployed. Deploy value is specified in the Event configuration data.
        2. If the corresponding Event contract already exists - Event configuration calls the `confirmEvent` Event contract method. The parameters are:
            1. `IEvent.EthereumEventInitData eventInitData` - event data
            2. `uint relayKey` - relay's public key
        3. Event contract receives the call, stores the key and check if enough confirmations / rejects is collected.
2. Some relays may call the `rejectTonEvent` Bridge method. The parameters are the same, expect `eventDataSignature` not needed
    1. The following pipeline is the same: `Bridge -> TON Event Configuration -> Event contract`
    2. The difference is that Event configuration don't send the deploy Event contract message.
    Only trying to call the `rejectEvent` method for corresponding Event contract.
    3. If Event contract collects enough rejects - it turns into `Rejected` status and sends all balance back to the parent Event configuration.
3. Some relays may call the `confirmTonEvent`. The parameters are the same as in case of initial `confirmTonEvent` Bridge method.
    1. The following pipeline is the same: `Bridge -> TON Event Configuration -> Event contract`
    2. If Event contract collects enough confirmations - it turns in `Confirmed` status and sends all balance to the parent Event configuration.
4. Anyone can take encode the `eventInitData` according to the Ethereum callback structure, list of `eventDataSignature` and
call the corresponding Ethereum Event proxy contract callback.

## Ethereum event pipeline

The pipeline for confirming Ethereum event is pretty same, expect the following differences:

- `eventDataSignature` don't used, since the callback contract is FT contract
- Event data structure is different - `IEvent.EthereumEventInitData`
- After Event contract stores enough confirmations it execute the `Event proxy` callback
