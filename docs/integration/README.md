# Integrating with the bridge

Bellow you can see the example of integrating Ethereum and FT Dapp into the Bridge.

We will create the simple contract `Storage` which store the state in a form of `bytes state`. The desired behaviour is following:

- When Ethereum contract stores new state, then the FT contract's state should be updated to the new state
- When FT contract stores new state, then the relays should provide enough signatures, so the Ethereum's state can be updated

## Contracts

Two `Storage` contracts will be deployed - one in Ethereum and the second one in FreeTON.

- [Code sources](./contracts)

## Integrating Ethereum-FreeTON stream
