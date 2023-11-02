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

## [VN-033][Medium]Centralization_Risk.md

Fixed. Removed `mint` and `burn` functions.

## [VN-034][Medium]Potential WETH Address Manipulation.md

Fixed. Removed `setWeth` function.

## [VN-035][High]Invalid Fee Beneficiary Handling for Zero Liquidity.md

Fixed.
 
## [VN-036][Critical]Share Inflation and Front-Running in Multivault Contracts.md

Fixed. Only `governance` or `management` can make a first deposit.

## [VN-037][High]Potential_Funds_Lock.md

Fixed. Increased `FORCE_TIMEOUT` to 3 days. Minting tokens back would significantly affect every part of the bridge architecture, which is unacceptable.

## [VN-038][Medium]Incorrect Implementation of Diamonds Storage Slots.md

Without changes.

## [VN-039][Medium]Potential Funds Lock on Event Rejection.md

Without changes.

## [VN-040][Medium] Outdated OpenZeppelin Contracts Used.md

Fixed - 97437ee8ee44524f05a8a5714e069ffff086a9d1.

## [VN-041][Medium]Mismanagement of Deflationary Tokens in Liquidity Facet.md

Fixed. Added amount updatre after `safeTransferFrom`. Virtual list of approved tokens exists because of VN-036.

## [VN-042][Informational]Floating Pragma in tsol Files.md

Fixed. Using `>= 0.62.0`.

## [VN-043][Informational] Contradictory Naming.md

Without changes.

## [VN-045][Medium]Potential Funds Lock on Token Burn.md

Without changes. Correct calculation of the attached value is a key task of the UI.

## [VN-046][Medium]Potential Funds Lock on Event Rejection.md

Fixed.

## [VN-047][Medium]High Permissions May Lead to Data Inconsistency.md

Fixed.

## [VN-048]

Fixed.

## [VN-049][Medium]Overly Permissive Rescuer Role.md

Without changes.

## [VN-050][Low]Redundant Code Patterns in StakingRelay, StakingBase, and UserData Contracts.md

Without changes.

## [VN-051][Informational]Redundant Constant Variables in Multiple Contracts.md

Without changes.

## [VN-052][Informational]Redundant Modifier in Delegate Contract.md

Fixed.

## [VN-053][Informational] Redundant Functionality.md

Without changes.

## [VN-054][Low] Unlimited Event Size Allows Relayer To Burn Service Contract Balance.md

Fixed.

## [VN-055][Low]Test-only Contract Not In MockTest Folder.md

Fixed. Removed `Receiver`

## [VN-057][Medium]Transaction Replay Possibility in `close()` Function.md

Fixed.

## [VN-059][Low]Transaction Replay Possibility in constructor.md

Without changes.

## [VN-060][Medium]Unrestricted Access to `deploy()` Function.md

Fixed.

## [VN-061][Medium] Funds Lock Due To Initialization Front Run.md

Fixed.

## [VN-062][High] Funds Loss Due To Initialization Front Run.md

Fixed.

## [VN-063][Low]Not_Explicit_Interface_Usage.md

Fixed.

## [VN-064][Low] Redundant Event Declaration.md

Fixed.

## [VN-065]Possible Not Implemented Emergency Shutdown Functionality in Bridge.md

Fixed.

## [VN-066][Informational] Name Contradiction In MultiVaultStorage Contract.md

Fixed.

## [VN-067][Low] Missing Zero Address Check.md

Fixed.

## [VN-068][Low] Redundant Inheritance of MultiVaultHelperEverscale.md

Fixed.

## [VN-069][Informational] Missing Function Declarations in Interfaces.md

Fixed.

## [VN-070][Informational]Redundant Check.md

Fixed.

## [VN-071][Low] Incorrect int Type Size Used.md

Fixed.

## [VN-072][Low] NatSpec Contradiction.md

Fixed.

## [VN-073][Low] TODO Comments in Production Code.md

Fixed.

## [VN-074][Low] CEI Violation With Event Emission.md

Fixed.

## [VN-075][Low] Missing Validation in _getNativeWithdrawalToken.md

Fixed.

## [VN-076][Low] Contradictory Documentation on Event Confirmation and Rejection.md

Fixed.

## [VN-077][Low] Hardcoded Values and Magic Numbers.md

Fixed.

## [VN-078][Low] Inaccurate Comment on Relay Membership Lock Time.md

Fixed.

## [VN-079][Low] Documentation Mismatch Regarding Function Access.md

Fixed.

## [VN-080][Low] Documentation Mismatch Regarding Native.md

Fixed.

## [VN-081][Low]Missing Zero Address Checks.md

Fixed.

## [VN-082][Low] Missing cashBack Modifier.md

Fixed.

## [VN-083][Informational] Commented-out Code.md

Fixed.

## [VN-084][Low] Missing Validation in DaoRoot.md

Fixed.

## [VN-085][Low] Missing Zero Address Checks in DaoRoot.md

Fixed.

## [VN-086][Low] Missing Zero Address Validation in StakingBase.md

Fixed.

## [VN-087][Medium]Incorrect_withdrawn_alien_token_amount_in_callback.md

Fixed.