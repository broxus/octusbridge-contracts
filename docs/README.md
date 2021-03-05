# TON bridge documentation

This document is a starting point about the Broxus TON bridge between Ethereum and FreeTON.

## Abstract

TON Bridge allows to transfer events between Ethereum and FreeTON blockchains in a secure, decentralized way.
It consists of

- set of Ethereum smart-contracts
- set of FreeTON smart contracts
- additional software, such as relay node

Basically, if event emitted in Ethereum, information about it will be submitted in FreeTON by relays. After consensus is reached,
the FreeTON callback contract will be called.

If event emitted in FreeTON, relays send their signatures in FreeTON and, after consensus is reached, 
anyone can call the Ethereum callback contract, with the provision of signatures.

Anyone can add support for any `(Ethereum event, FreeTON callback)` or `(FreeTON event, Ethereum callback)`.

## Architecture

**Картинка с общей архитектурой**

### Transferring event from Ethereum to FreeTON

**Картинка: сбор подписей, колбэк**

### Transferring event from FreeTON to Ethereum

**Картинка: сбор подписей, колбэк в эфире**

## Integrating Bridge

Bellow you can see the example of integrating Ethereum and FreeTON Dapp into TON Bridge. We will create the
simple contract `Storage` which store the state in a form of `bytes state`.

Two `Storage` will be deployed - one in Ethereum and the second one in FreeTON. The desired behaviour, is when

### Integrating Ethereum into FreeTON stream

**Пример state-store**

### Integrating FreeTON into Ethereum stream

**Пример state-store**

## Process description

- [Initializing Bridge](./initialize-bridge.md)
- [Ethereum event proxy specification](./event-proxy-specification-eth.md)
- [TON event proxy specification](./event-proxy-specification-ton.md)
- [Event configuration](event-configuration.md)
- [Handling event](./handling-event.md)
- [Updating Bridge relays set](./update-bridge-relay-set.md)
- [Updating Bridge configuration](./update-bridge-configuration.md)
