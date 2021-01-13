# Event configuration contract

Event configuration contract stores data about the event that should be mirrored. Event configurations can be two types:

- Ethereum-TON event configuration
- TON-Ethereum event configuration

Configurations contracts live on the TON blockchain. They stores the following data:

- Which contract emits the event
- Event ABI
- How much confirmations needs to confirm event
- How much rejects need to reject event forever (e.g. created by malicious relay)
- Code of the Event contract
- Address of the Bridge in TON
- How much TON to send to the Event contract on deploy

And some network-specific parameters.
Detailed structure of the data can be found in [IEventConfiguration.sol](./../free-ton/contracts/interfaces/IEventConfiguration.sol).

## Initialize pipeline

To add new event support (both directions), relays need to activate new Event configuration contract at the Bridge.

1. One of relays initialize new configuration by calling the `initializeEventConfigurationCreation` Bridge method. The parameters are:
    1. `id` - configuration ID, should be not used at the moment of initializing
    2. `addr` - event configuration contract address
    3. `IEventConfiguration.EventType _type` - event configuration type. `Ethereum` or `TON`, which in which network event emits.
2. Some relays may call the `voteForEventConfigurationCreation` with `vote:false` which means reject
    1. If configuration collects required amount of rejects first, the configuration removes from the Bridge storage
    2. Same `id` may be used again
3. Some relays may call the `voteForEventConfigurationCreation` with `vote:true` which means confirm
    1. If configuration collects required amount of confirmations first, the configuration turns active

The event configuration details can be read with `getEventConfigurationDetails` Bridge method.
After the configuration is confirmed, it may be used for spawning Event contracts.

## Update pipeline

It's possible that relays want to update previously activated configuration. THe update can be of two types:

- Update some details in the exact Event configuration contract (e.g. Ethereum contract address, that emits the event)
- Update the address of the Event contract

It's possible to do without deactivating the Event configuration contract.

1. One of relays initialize event configuration update by calling the `initializeUpdateEventConfiguration` Bridge method. Parameters specify the:
    1. `id` - update ID, should be not used at the moment of initializing
    2. `targetID` - ID of the event configuration which is planned to be updated. Should exist at the moment of initializing
    3. `addr` - new address for event configuration. If it don't need to be changed - set it the same as current
    4. `basicInitData` - basic initial data for Event configuration. If it don't need to be changed - set it the same as current
    5. `ethereumInitData` and `tonInitData` - Network's specific event configuration.
    If updating the Ethereum event configuration, fill the `tonInitData` with dummy data, it won't be used and vice versa.
    If the data don't need to be changed - set it the same as current
2. Some relays may call the `voteForUpdateEventConfiguration` with `vote:false` which means reject update
    1. If update collects required amount of rejects first, the update removes from the Bridge storage.
    2. Same `id` may be used again
3. Some relays may call the `voteForUpdateEventConfiguration` with `vote:true` which means confirm update
    1. If update collects required amount of confirmations first, the update comes into force
    2. Event configuration address replaces with `addr`
    3. Bridge calls the Event configuration `updateInitData` method with new `basicInitData` and `ethereumInitData` / `tonInitData`

## Disable pipeline

It's possible that relays want to deactivate previously activated configuration.

To do this, some relays should call the `voteForEventConfigurationCreation` Bridge method with `vote:false`.
If enough rejects collects, configuration will be removed from the Bridge storage.
All the event confirmations / rejects corresponded to this ID won't be accepted by Bridge anymore, until ID is activated again.

## Example

[Ethereum-TON](./../free-ton/contracts/event-configuration-contracts/EthereumEventConfiguration.sol) and [TON-Ethereum](./../free-ton/contracts/event-configuration-contracts/TonEventConfiguration.sol) event configurations.
