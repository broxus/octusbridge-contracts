# Welcome to the Broxus FreeTON-Ethereum bridge

This document is a starting point about the Broxus bridge between Ethereum and FreeTON \(hereinafter the "FT"\).

## Introduction

The Broxus FT-Ethereum Bridge allows to transfer events between Ethereum and FT networks in a secure, decentralized way. It consists of

* set of Ethereum smart-contracts
* set of FT smart contracts
* additional software, such as relay node

Basically, if event emitted in Ethereum, relays submit the confirmations in FT. After consensus is reached, the FT callback contract, corresponding to this event, will be called.

If event emitted in FT, relays submit the confirmations + specific Ethereum payload signatures in FT. After consensus is reached, anyone can call the Ethereum callback contract, with the provision of payload and signatures.

For now, only relays can add support for new events. But we plan to get rid of this limitation in the future so that anyone can build the cross chain FT-Ethereum Dapps.

## Getting started

* [Bridge components and architecture](docs/architecture.md)
* [Contracts specification](docs/specification.md)
* [Artifacts](docs/artifacts.md)

