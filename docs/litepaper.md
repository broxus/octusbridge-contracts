# Abstract

This document is a simplified version of White Paper for Octus Bridge V2.

The following describes both the basic functionality of the Bridge V2 and emerging features of this product, such as:
* Bridge[^1] token staking; 
* Relayer auction, which allows stakeholders to become relayers;
* Connection of any EVM[^2]-compatible blockchains and most of other chains supporting smart-contracts;
* Liquidity management on the EVM side with subsequent buyback of Bridge tokens and their distribution among stakeholders;
* Bridge V2 management using DAO, with the possibility of creating cross-chain proposals. 

This document is not technical and does not cover actual implementation of the product, but rather gives an idea of the capabilities of Octus Bridge V2.

[^1]: The Bridge token is a token in the Everscale network, and the bridge is a protocol that transfers events between EVM networks and Everscale
[^2]: EVM stands for Ethereum Virtual Machine. Examples of EVM compatible blockchains are Ethereum, Binance Smart Chain, Polygon, Fantom, xDai, and so on

# Introduction

Octus Bridge V1 is a bridge between Ethereum and Everscale. First, the bridge supports the transfer of tokens between Ethereum and Everscale. 20 Ethereum tokens are connected to Octus Bridge V1, including USDT, DAI, USDC, WBTC, WETH, WTON[^3] etc. The TVL for all tokens exceeds $40 million.

The first version of the Octus Bridge was significantly centralized - events were confirmed by a group of three relayers. The possibility of adding external relayers was intentionally limited in order to minimize risks in the early days of the project. All administrative functions were in the hands of a multisignature wallet, controlled by the [Broxus](https://broxus.com) team.

After six months of successful operation we are now launching a new, significantly expanded version - Octus Bridge V2.

[^3]: Wrapped Everscale is an equivalent to the Wrapped Ether token, but for the native token of the Everscale network - EVER

# Technical overview

The basis for the V2 operation is:

- Set of smart contracts on the Everscale network;
- Set of smart contracts on each connected EVM network;
- A specialized software - relayer node. This software must be run by special actors - relayers. They keep up the bridge running, just as miners keep up running the PoW networks.

The task of relayers is monitoring and confirmation of a set of events[^4] in EVM networks and Everscale.

For example, in case a user deposits DAI into a special smart contract (Vault) on the Ethereum side, each relayer sends a special transaction to the Everscale network. This transaction confirms the fact of a deposit event on the Ethereum network. As soon as quorum is reached, the DAI token is automatically minted on the Everscale side.

![EVM-Everscale-token-transfer](assets/Broxus-Bridge-litepaper-06-oct-ETH-Everscale-token-transfer.drawio.png)

In the Everscale→EVM direction, the bridge works similarly, with one exception. Due to potentially high network fees, relayers do not send transactions to the EVM networks. Instead, relayers have to sign specific EVM-compatible payload with their key, and put the signature in a special contract in the Everscale network. Each connected EVM network has a special contract (Bridge), which stores the public keys of the relayers, so it's possible to verify, that the signature is made by the actual relay. Anyone can send a payload and a list of signatures to Vault, and if the signatures are correct, Vault will send tokens to the user's Ethereum address.

![Everscale-EVM-token-transfer](./assets/Broxus-Bridge-litepaper-06-oct-Everscale-ETH-token-transfer.drawio.png)

[^4]: The list of events is stored on-chain on the Everscale side. The DAO can add new events to this list and delete old ones

# V2 features

## Staking Bridge tokens

Together with the release of Octus Bridge V2, the project now has a governance token - Bridge. Any token holder can stake it in the Bridge, after which they will start receiving Bridge tokens. These Bridge tokens will come from the sale of tokens earned from liquidity management on the EVM side.

As an example of liquidity management on the EVM side, we can consider staking 1,000 Bridge tokens over 1 year. With a monthly distribution of gains, the yield from staking can be up to 99% per annum at the current level of the Bridge token exchange rate ([Appendix 1](#1-bridge-tokens-staking)).

## Relayer auction

Any stakeholder who has staked over 100,000 Bridge tokens can become a relay. To do this, a stakeholder just needs to start a relayer node and apply for the next election. The elections take place every round, each round lasts one week. The duration of the round and the size of the minimum stake for becoming a relayer can be changed by the DAO.

![Relayer-auction](./assets/Broxus-Bridge-litepaper-06-oct-Round-elections.drawio.png)

If the relayer behaves maliciously - for example, confirms incorrect events, or does not participate in events confirmation, DAO can slash the relay. In this case, the relay's stake and reward will be distributed among the current stakeholders.

The appendix considers a scenario for managing a relayer with 100,000 Bridge tokens steak over 1 year ([Appendix 2](#2-relay-bridge-staking)).

## Connecting the EVM compatible blockchain

The first version of the Bridge only worked between Ethereum and Everscale. Our new protocol allows connecting any EVM compatible blockchain to the Everscale bridge V2 (such as Polygon, Binance Smart Chain, xDai, Fantom, etc.).

![EVM-star](./assets/Broxus-Bridge-litepaper-06-oct-EVM-star.drawio.png)

The number of blockchains that can be connected is unlimited. The decision to connect a new network is made by the DAO. In fact any EVM blockchains can be interconnected without the need to develop any specialized bridges.

## Liquidity management on the EVM side

TVL of bridge V1, exceeded $30.5 Million. In the first version, when a user transferred the tokens from Ethereum to Everscale, their Ethereum tokens were locked in a special contract in Ethereum. The tokens could be withdrawn from this contract only if someone made a token withdrawal from the Everscale.

Everscale bridge V2 introduces a procedure for managing these funds. Tokens that are locked on the EVM network can be transferred to various yield farming protocols. The capital gains will be sent to the Everscale network through the bridge, from there it will be converted to a Bridge token and distributed between stakeholders and relayers. For the first time, tokens will be distributed between stakers and relayers in the ratio of 50% and 50%. This ratio can be changed by the DAO.

The appendix considers a scenario with x10 TVL growth over a year, starting with $30 million in liquidity on the EVM side. A 50% liquidity management at 6% yield could yield $4.5 million to be distributed among the Bridge stackers and relayer managers ([Appendix 3](#3-evm-liquidity-management)).

### The use of Yearn Vaults V2

An important feature of the V2 is the utilization of Yearn Vaults V2. Any token transfer from EVM to Everscale is now a deposit to the corresponding Everscale bridge Vault. Our contracts are fully compatible with Yearn strategies. Therefore, locked tokens on the Ethereum side, and other connected EVM blockchains, can be easily handed over to yield farming strategies.

It is important to note that not all locked funds in Vaults will be distributed between strategies. As it is essential to give users the opportunity to instantly withdraw their liquidity from Everscale. In order to accomplish this, DAO, in every Vault, specifies the share of funds, which will be distributed to the strategies.

### Role model

Basically, all the decisions related to liquidity management are made by the DAO. However, the process of making decisions through the DAO takes a long time. Some decisions in Vault need to be made quickly - therefore two additional roles with limited privileges were implemented. It is important to note that these roles do not have access to directly withdraw tokens from the Vault.

#### Management

This role is responsible for strategies performance and the adjustment of some Vault parameters. For example, management can change the fee amount on deposits and withdrawals from Vault.

#### Guardian

This role has the possibility to promptly disable deposits and withdrawals from the Vault. Guardian can also shut down any connected strategy and withdraw funds from the strategy directly to the Vault.

## DAO

The new version of the bridge introduces a DAO managed by Bridge token stakeholders. DAO makes all decisions related to the bridge configuration, relayer slashing, adding new tokens, adding new networks, managing locked liquidity and so on. The bridge V2 DAO is designed with the best practices of popular DeFi protocols such as Compound and AAVE in mind.

Any stakeholder with more than 100,000 Bridge tokens can create a DAO proposal. When a DAO proposal is created, a 48-hour review period is commenced. Proceeding the review period, a 72 hour voting phase begins. At least 500,000 votes are required in order to have the proposal obtained. If the majority cast “yes”, then the proposal enters a 48 hour timelock phase. After that, the proposal can be executed.

### Cross Chain Proposals

Despite the fact that the creation of proposals and the voting for them takes place in the Everscale network, actions in any EVM connected networks can be indicated in the proposal. Moreover, one proposal can contain a set of actions in several networks at once - for example, in Everscale, in Ethereum and in Avalanche. This is possible due to the fact that the DAO is integrated within the bridge itself and the proposals can be transferred to any connected network. Thus, Everscale bridge launches the first cross-chain DAO, with the ability to manage any EVM compliant networks at once.

![DAO-cross-chain-proposal](./assets/Broxus-Bridge-litepaper-06-oct-DAO_crosschain_proposal.drawio.png)

## Arbitrary events support

As mentioned previously, the main function of Everscale bridge V1 is transferring tokens between Everscale and Ethereum. In the new version, we added support for arbitrary events. This means that bridge V2 can be used for building cross-chain Dapps of any variation. In layman’s terms, the event configuration is as follows: `(network, target event) → (network, action)`. For example, token transfer event configurations are as follows:

- `(Everscale, withdraw Dai to Ethereum) → (Ethereum, release Dai)`
- `(Ethereum, lock Dai) → (Everscale, mint Dai)`

Bridge V2 has no limitations on the types and number of connected event configurations. For example, the target event could be an update of the Chainlink rate, and the action would be a swap on a decentralized exchange in the Everscale network. Adding a custom event occurs through a special DAO proposal and does not require updating the relayer node.

- (Everscale, withdraw Dai to Ethereum) -> (Ethereum, release Dai)
- (Ethereum, lock Dai) -> (Everscale, mint Dai)

Bridge V2 has no limitations on the types and number of connected event configurations. For example, the target event could be an update of the Chainlink rate, and the action would be a swap on a decentralized exchange in the Everscale network. Adding a custom event configuration occurs through a special DAO proposal and does not require updating the relayer node.

# Appendix

## Legends and assumptions

| Term 								| Legend 																			|
| --------------------------------- | --------------------------------------------------------------------------------- |
| '000 								| Thousands of units  																|
| bop  								| Beginning of period 																|
| eop  								| end of period 	  																|
| Locked EVM 50% funds yield 		| 50% of Locked EVM fund allocated in different strategies with 6% ARP 				|
| EVM funds influx 					| Linear growth of funds 															|
| Bridge distribution 				| Farming, Presale, Broxus, DeFi Alliance 											|
| Bridge inflow 					| Distribution of 10% of Bridge tokens    											|
| Bridge tokens staked (relayer and Users) | Equal all relayers staked 100 000 each 									|
| Number of relayers 				| Starting 16 presale relayers and adding 1 relayer each month 						|
| Bridge Stakeholders gains share 	| 50% of Locked EVM 50% funds yield will be distributed among BRIDGE stakeholders 	|
| Bridge tokens stake 				| Initial stake 																	|
| Bridge staking gains 				| Gains per invested Bridge tokens 													|
| Relayer gains share 				| 50% of Locked EVM 50% funds yield will be distributed among relayers 				|
| Invested stake 					| Initial stake of 100 000 Bridge tokens and relayer activity 						|
| Relayers' gains 					| Gains for relayer activity 														|

## 1. Bridge tokens staking

![appendix-1](./assets/appendix-1.png)

## 2. Relayer Bridge staking

![appendix-2](./assets/appendix-2.png)

## 3. EVM liquidity management

![appendix-3](./assets/appendix-3.png)

# Disclaimer

This paper is for general information purposes only. It does not constitute investment
advice or a recommendation or solicitation to buy or sell any investment and should not
be used in the evaluation of the merits of making any investment decision. It should not
be relied upon for accounting, legal or tax advice or investment recommendations. This
paper reflects current opinions of the authors and is not made on behalf of Broxus or its
affiliates and does not necessarily reflect the opinions of Broxus, its affiliates or individuals
associated with Broxus. The opinions reflected herein are subject to change without being
updated.