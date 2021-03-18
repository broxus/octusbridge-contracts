# Welcome to the Broxus FreeTON-Ethereum bridge

This document is a starting point about the Broxus TON bridge between Ethereum and FreeTON (hereinafter the "FT").

## Introduction

TON Bridge allows to transfer events between Ethereum and FreeTON blockchains in a secure, decentralized way.
It consists of

- set of Ethereum smart-contracts
- set of FreeTON smart contracts
- additional software, such as relay node

Basically, if event emitted in Ethereum, information about it will be submitted in FreeTON by relays. After consensus is reached,
the FreeTON callback contract, corresponding to this event, will be called.

If event emitted in FreeTON, relays send their signatures in FreeTON. After consensus is reached, anyone can call the Ethereum callback contract,
with the provision of signatures.

For now, only relays can add support for additional events.

## Getting started

- [Bridge architecture](./docs/architecture)
- [Integration with bridge](./docs/integration)
- [Contracts](./docs/contracts.md)
