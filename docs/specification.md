# Contracts specification

This doc describes the key smart contracts in the Bridge ecosystem. The exact methods specification can be found in the
sources docstrings.

The bridge flow is based on the Ethereum and FT contracts. They are storing and handling all the viable logic,
about cross chain events transferring.

There are two types of contracts, who take part in the event transfer procedure:

- Bridge contracts

This contracts are part of the Bridge ecosystem. They're currently deployed and maintained by the Broxus team.

- Integration contracts

To integrate your Dapp with the bridge, you need to create a set of contracts, which are compatible with the Bridge contracts.

## Note on Proxy

In the bridge ecosystem, the term proxy is used in two different senses.

1. Bridge Ethereum contracts are deployed with Upgradeable Proxies pattern
2. This is also the name of contracts that execute the callback logic as a result of reaching consensus on event (both in Ethereum and FT)

## Bridge contracts

### Ethereum-Bridge

[Source](./../ethereum/contracts/Bridge.sol)

This contract is a key bridge contract in the Ethereum network. It stores the list of relay's addresses,
so anyone can interact with it for verification purposes. For example - check that specific signature was made by the actual relay.

### FT-Bridge

[Source](./../free-ton/contracts/Bridge.sol)

This contract is an entry point for interacting with the FT bridge ecosystem. It stores the set of relay's public keys.
It also manages the process of adding / confirming / rejecting / updating event configurations contracts.

## Integration contracts

The contracts bellow should be developed by those, who wants to integrate with the bridge. So the implementation may differ.

### Ethereum

#### Event emitter contract

[Example](./../ethereum/contracts/examples/ProxyTokenLock.sol)

This contract emits event, which should be supported by the bridge.
To support your event you need to add new [Ethereum event configuration](#ethereum-event-configuration) FT contract.

For example, in case of cross-chain token transfers, this contract is called [TokenLock contract](./../ethereum/contracts/examples/ProxyTokenLock.sol).
Transaction with token locking emits `TokenLock` event, which is supported by the bridge.

#### Ethereum-proxy

[Example](./../ethereum/contracts/examples/ProxyTokenLock.sol)

This contract should execute callback logic, after the TON event has been confirmed by the relays.
Usually, it accepts the `TonEvent` [structure](./../ethereum/contracts/interfaces/IBridge.sol) and
the list of corresponding signatures, made by relays.

In the cross chain token lock contracts, the Ethereum proxy and the Ethereum event emitter is the same contract.

**Attention!** The developer must think about replay-protection himself! Ethereum-Bridge is read-only and not implements this layer of security. The
example of such protection is given in the [ProxyTokenLock](./../ethereum/contracts/examples/ProxyTokenLock.sol) contract, `broxusBridgeCallback` method.

### FT

#### Ethereum event configuration

[Example](./../free-ton/contracts/event-configuration-contracts/EthereumEventConfiguration.sol)

To add support for specific Ethereum event into the bridge ecosystem, the developer needs to create Ethereum event configuration contract.
It stores all the details about the event and it's [Proxy contract](#ethereum-event-proxy).
It also should implement methods to receive confirmation / reject messages from the bridge - see the example.

#### Ethereum event proxy

[Example](./../free-ton/contracts/additional/EventProxySimple.sol)

This contract is used to implement callback logic. It should implement
the `broxusBridgeCallback` method, which is called by the corresponding [Ethereum event contract](#ethereum-event-contract) after relays
have confirmed the event.

**Attention!** Proxy should verify that the callback function is called by correct Ethereum event contract - see the example.

#### TON event configuration

[Example](./../free-ton/contracts/event-configuration-contracts/TonEventConfiguration.sol)

To add support for specific TON event into the bridge ecosystem, the developer needs to create Ton event configuration contract.
It stores all the details about the event and it's callback logic, which is basically the address of the [Ethereum proxy](#ethereum-proxy) contract.

#### Event contracts

The event contract pattern is a recommended way to integrate with the bridge.
Each new event (FT or Ethereum) confirmation leads to deployment of a separate event contract.
This pattern fits well with FT architecture. General practice - deploy lots of small contracts instead of one big one.

Event data is placed in the "initial data" section, so new event leads to the new event contract.

##### Ethereum event contract

[Example](./../free-ton/contracts/event-contracts/EthereumEvent.sol)

This contract used to store confirmations and rejections for specific Ethereum event. After enough confirmations is
received, [Ethereum event proxy](#ethereum-event-proxy) callback may be called.

##### TON event contract

[Example](./../free-ton/contracts/event-contracts/TonEvent.sol)

This contract used to store confirmations and rejections for specific TON event. Also it stores `TonEvent` Ethereum structure relay's signatures.

