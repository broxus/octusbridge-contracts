# Broxus Ethereum-FreeTON bridge documentation

Broxus Bridge is a set of Ethereum smart-contracts, FreeTON smart contracts and additional software, such as
relay node. It which allows to mirror events between Ethereum and FreeTON blockchains.
Any event happened in Ethereum can have a callback in the FreeTON, which can be triggered after relays consensus is reached and vice versa.

## Process description

- [Initializing Bridge](./initialize-bridge.md)
- [Ethereum event proxy specification](./event-proxy-specification-eth.md)
- [TON event proxy specification](./event-proxy-specification-ton.md)
- [Event configuration](event-configuration.md)
- [Handling event](./handling-event.md)
- [Updating Bridge relays set](./update-bridge-relay-set.md)
- [Updating Bridge configuration](./update-bridge-configuration.md)
