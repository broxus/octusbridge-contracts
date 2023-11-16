<p align="center">
  <a href="https://github.com/venom-blockchain/developer-program">
    <img src="https://raw.githubusercontent.com/venom-blockchain/developer-program/main/vf-dev-program.png" alt="Logo" width="366.8" height="146.4">
  </a>
</p>

# Integration documentation

[https://integrate.octusbridge.io/](https://integrate.octusbridge.io/)

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