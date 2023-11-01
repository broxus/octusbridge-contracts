# Comments

## [VN-001][Medium]Signature Malleability Through Direct Usage Of Ecrecover.md

Fixed - 278b82b876d18390d31a6eac4200d0af8a535272. Implemented `tryRecover`, added asseration for zero address.

## [VN-002][Medium]Mismanagement_deflationary_tokens.md

Fixed - 49d7683939e3a7453996789be86d31f9319f241c. Implemented balance check after `safeTransferFrom`.

## [VN-003][Medium]Overpayment.md

Without changes. Due to the lack of oracles, there's no way to reliably estimate the exchange rate.
Setting up the upper limit for `msg.value` based on the exchange rate estimation from above, can lead to denial of service during periods of exchange rate fluctuations.
Also, overpaying does not result in funds loss. Instead, user receives more VENOMs than expected, which can be converted back later.

## [VN-004][Low]Empty_require.md

Fixed -  0be7d150a54497a884cea111911ff3177717895e. Added requirements strings, except MultiVaultToken due to the upgrade limitations.

## [VN-005][Low]Contract_name_reuse.md

Fixed. The whole `ethereum/contracts` folder is refactored. Important changes:

- Moved `ethereum/contracts/multivault/multivault` content into `ethereum/contract/multivault`
- Removed all local OZ contracts, replaced local imports with `@openzeppelin` imports
- Removed all duplications
- `MultiVaultToken` and relative contracts are not upgraded, code hash remains the same

## [VN-006][Informational]Floating_pragma.md

Fixed. Two pragmas left:

- `MultiVaultToken` and relevant contract are still using `0.8.0` since they can't me modified
- Rest of the contracts are using `^0.8.20`

New facet `MultiVaultFacetTokenFactory` is introduced. It has same Solidity version ad `MultiVaultToken` and implements all the interactions with MV tokens - deployment, mint, burn.
Note: interface `IMultiVaultFacetTokenFactory` has `^0.8.20` Solidity version and is not inherited directly by facet, it only describes the interface.

## [VN-007][Informational]Style_guides.md

## [VN-008][Medium]Race_condition.md

Fixed. Privilage for updating fees changed to `onlyGovernance`. In the mainnet, the `governance` role will be transferred to DAO, which already implements the actions delay.

## [VN-009][Low]Missing_events.md

Fixed.

## [VN-010][Low]Test_contracts.md

Fixed.

## [VN-011][Low]Arithmetic_underflow.md

Fixed.

## [VN-012][Medium]Inconsistency_across_Chains.md

Fixed - 0be7d150a54497a884cea111911ff3177717895e. Removed `setCustomNative` functions. Made `address custom` field deprecated.

## [VN-013][Medium]Missing_validation.md

Fixed. Added `drain` function for recovering lost tokens. Added condition to `onAlienWithdrawal`.

## [VN-014][Low]Missing_storage_gaps.md

Fixed. Marked `Cache` as abstract. Removed `ChainId` contract, replace it with `block.timestamp`. Added `__gap` to `Cache` contract.

## [VN-015][Informational]Redundant_Code.md

Fixed.

## [VN-016][Low]Redundant_functions.md

Fixed.

## [VN-017][Low]Redundant_import_statements.md

Fixed.

## [VN-018][Low]Missing_visibility.md

Fixed.

## [VN-019][Medium]Ownership Irrevocability.md

Fixed.

## [VN-021][Informational]Redundant State Update.md

Fixed.

## [VN-022][Informational]Unused Modifier.md

Fixed.

## [VN-023][Medium]Transaction Replay Attack On `deployEvents`.md

Fixed. Added `MsgFlag.IGNORE_ERRORS` flag, so insufficient balance does not lead to an execution error.

## [VN-024][Medium]Transaction Replay Attack On `queue`.md

Fixed. Added requirement before `tvm.accept()`.

## [VN-025][Informational]Redundant Control Logic in `removeToken` Function.md

Fixed.

## [VN-026][Informational]Inefficient Token Existence Check in Bulk Operations.md

Fixed.

## [VN-027][Informational]Redundant Code in DiamondProxy Storage Functions.md

Fixed.

## [VN-028][Informational]Redundant Function Addition Logic in DiamondProxy Storage Functions.md

Fixed.

## [VN-029][Informational]Redundant Zero-Check Logic in MultiVault Token Fee Increase Function.md

Fixed.

## [VN-030][Informational]Inefficient_Event_Emission.md

Fixed.

## [VN-031][Medium]Incorrect_hardcoded_value.md

Without changes. Hardcoded token cash is the cheapest method for deriving token address. All risks are known, `MultiVaultToken` code won't be changed in any future upgrades.
If the code is updated by mistake, automatic tests will fail.

## [VN-032][Medium]Inefficient Gas Management.md

Fixed. Aggregate check is not necessary - if there's not enough value, transaction will fail with revert too. Refactored `_deployEvent`.

## [VN-040][Medium] Outdated OpenZeppelin Contracts Used.md

Fixed - 97437ee8ee44524f05a8a5714e069ffff086a9d1.