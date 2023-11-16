<p align="center">
  <a href="https://github.com/venom-blockchain/developer-program">
    <img src="https://raw.githubusercontent.com/venom-blockchain/developer-program/main/vf-dev-program.png" alt="Logo" width="366.8" height="146.4">
  </a>
</p>

# Integration documentation

[https://integrate.octusbridge.io/](https://integrate.octusbridge.io/)

# Rescuer role in a Staking contract

In the context of our staking contract, the rescuer role is a critical component designed to manage emergency situations. This section outlines the responsibilities, limitations, and procedural guidelines associated with the rescuer role, ensuring a clear understanding of its purpose and functioning within the contract ecosystem.

## Purpose

The rescuer role serves as an emergency response mechanism within the staking contract. Its primary function is to safeguard assets and maintain the integrity of the contract in the face of immediate threats or anomalies.

## Responsibilities

- Emergency Activation: The rescuer has the capability to set the contract into an emergency state. This action is taken in response to detected threats or contract vulnerabilities that could jeopardize the security of the assets or the functioning of the contract.

- Alert System: The rescuer acts as an alert system, identifying potential risks and initiating the emergency protocol.

## Procedural Guidelines

1. Emergency Activation: Upon detecting a threat, the rescuer activates the emergency state and notifies the DAO immediately.

2. DAO Notification: The DAO is alerted through predefined communication channels, and an emergency session is convened.

3. DAO Deliberation and Action: The DAO assesses the situation, votes on the necessary actions (including asset withdrawals or contract modifications), and implements these decisions in a timely manner.

4. Post-Emergency Review: After resolving the emergency, a thorough review is conducted to analyze the response efficacy, improve protocols, and mitigate future risks.

# Potential Funds Lock on Event Rejection in TVM to EVM Bridge

Event rejection is essential for handling exceptional cases in the TVM to EVM bridge process, ensuring only valid transactions are processed. Users should double-check transaction details before burning tokens. Burning is irreversible, and errors can lead to permanent token loss. If an event is rejected, the current EverscaleEthereumBaseEvent contract does not re-mint burnt tokens. This means rejected events will result in permanent loss of funds.

# Potential Funds Lock on Token Burn in TVM to EVM Bridge

When burning tokens as part of the TVM to EVM bridge process, it's crucial to attach a sufficient amount of value (Gas) to the transaction. Burning tokens with a value that is too low to cover the necessary network fees can result in the irreversible loss of those funds.

## Calculating the Correct Value

To prevent fund loss, users must ensure they calculate the correct amount of value to attach to the burn transaction. This involves considering:

- Event's Minimal Balance
- Additional Network Fees: Add an extra amount to cover all anticipated network fees.

It's essential to accurately assess these costs to avoid any risk of fund loss during the token burning process.

# EVM documentation

## Diamond storage positions

The storage slots in the Diamond storage contracts are hardcoded (`DiamondStorage`, `MultiVaultStorage`, `MultiVaultStorageInitializable`, `MultiVaultStorageReentrancyGuard`). The reason for this is past migration of existing contracts,
from Transparent Proxy pattern to a diamond pattern. In the future, new variables will be added to a new storage, which slot
would be calculated in a way Diamond standard recommends.

Keep in mind, that `MultiVaultStorageInitializable` and `MultiVaultStorageReentrancyGuard`'s storage can't be upgraded or extended.

## MultiVault roles

- Governance

- Pending governance

- Guardian

- Management

- Withdraw guardian

|                                                        | Governance | Manager | Guardian | Withdraw manager | Diamond cut owner | Proxy owner |
| :----------------------------------------------------- | ---------- | ------- | -------- | ---------------- | ----------------- | ----------- |
| Enabling emergency mode                                | ✅          | ❌       | ✅        | ❌                | ❌                 | ❌           |
| Disabling emergency mode                               | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting native / alien configuration address           | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting withdrawal limits (daily, native) per token    | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Enabling / Disabling withdrawal limits                 | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting deposit limits per token                       | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting gas donor                                      | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting guardian                                       | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting withdraw guardian                              | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting management                                     | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Setting governance                                     | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Blacklist token                                        | ✅          | ❌       | ❌        | ❌                | ❌                 | ❌           |
| Approve / reject pending withdrawal                    | ✅          | ❌       | ❌        | ✅                | ❌                 | ❌           |
| Set native token prefix                                | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set token deposit fee                                  | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set token withdraw fee                                 | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Skim tokens                                            | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set default native deposit fee                         | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set default native withdraw fee                        | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set default alien deposit fee                          | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Set default alien withdraw fee                         | ✅          | ✅       | ❌        | ❌                | ❌                 | ❌           |
| Upgrade proxy implementation (currently Diamond proxy) | ❌          | ❌       | ❌        | ❌                | ❌                 | ✅           |
| Upgrade diamond cuts                                   | ❌          | ❌       | ❌        | ❌                | ✅                 | ❌           |

There is an additional role, called `gasDonor`. This address don't have any permissions in the MultiVault itseld. Instead, it receives all the value attached to `deposit` methods.