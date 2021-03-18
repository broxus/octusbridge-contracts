# Broxus FreeTON-Ethereum bridge architecture

This document describes the architecture of the bridge - set of smart contracts, such as bridge contracts and integration contracts for both networks.
The process description and an example of integration can be found in a separate document - [Bridge integration](./../integration).
Smart contracts specification be found [here](./../specification.md).

As an example of how the bridge works on practice, the cross-chain token transfers scheme is described bellow.

## Components

### Relays

Relays are responsible for the functioning of the bridge. Each relay runs a relay node, which are doing all the job:

- Monitor supported events in Ethereum and FT
- Confirming or rejecting events
- Monitor another relays submitting malicious transactions to reject them

The relay node is written in Rust and open source ([repo](https://github.com/broxus/ton-eth-bridge-relay)).

## Why FT?

The bridge requires a lot of technical transactions to be send. Each relay has to confirm / reject every event supported by the bridge.
Since the Ethereum is expensive, it is not suitable for such a task. That's why most of the interactions are happening in FT.
The Ethereum is used only as a settlement layer.

## Contracts

The bridge logic is based on the Ethereum and FT contracts. They are storing and handling all the viable logic,
about cross chain events transferring.

There are two types of contracts, who take part in the event transfer procedure:

- Bridge contracts

This contracts are part of the Bridge ecosystem. They're deployed and maintained by the Broxus team.

- Integration contracts

To integrate your Dapp with the bridge, you need to create a set of contracts, which are compatible with the Bridge contracts.

The description of the integration process can be found in a separate document - [Bridge integration](./../integration).

### Bridge contracts

#### Ethereum

##### Bridge

[Source](./../../ethereum/contracts/Bridge.sol)

This contract is a key bridge contract in the Ethereum network. It stores the list of relay's addresses,
so anyone can interact with it for verification purposes. For example - check that specific signature was made by the actual relay.

#### FT

##### Bridge

This contract is an entry point for interacting with the FT bridge ecosystem. It stores the set of relay's public keys.
It also manages the process of adding / confirming / rejecting / updating event configurations contracts.

### Integration contracts

The contracts bellow should be written by those, who want to integrate with the bridge. So the implementation may differ.

#### Ethereum

##### Event emitter contract

This contract emits event, which is should be supported by the bridge.
To support your event you need to add new [Ethereum event configuration](#ethereum-event-configuration) FT contract.

For example, in case of cross-chain token transfers, this contract is called TokenLock contract.
Transaction with token locking emits `TokenLock` event, which is monitored by the bridge.

#### FT

##### Ethereum event configuration

To add Ethereum event into the bridge ecosystem, you need to create "Ethereum event configuration" contract. It stores all the details about the event
plus [Proxy](#proxy) address. It also should implement methods to receive confirmation / reject messages from the bridge.

##### TON event configuration

In case you need to add support for specific FT event, you need to deploy this contract. It should contain the details about event 

##### Ethereum event contract

##### TON event contract

##### Proxy

## Examples

Bellow you can see the examples of the bridge integration on the example of cross-chain token transfers. This examples
are based on the tokens, which supply is created in the Ethereum and then transferred to the FT (WETH, Dai, etc). Tokens,
which are created in the FT (such as Wrapped TON), have a slightly different integration mechanism.

### Transferring tokens from Ethereum to FT

**Картинка: сбор подписей, колбэк в эфире**

### Transferring tokens from FT to Ethereum
