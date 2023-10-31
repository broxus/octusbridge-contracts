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

Fixed -  . Added requirements strings, except MultiVaultToken due to the upgrade limitations.

## [VN-005][Low]Contract_name_reuse.md

## [VN-006][Informational]Floating_pragma.md

## [VN-007][Informational]Style_guides.md

## [VN-008][Medium]Race_condition.md

## [VN-009][Low]Missing_events.md

## [VN-010][Low]Test_contracts.md

## [VN-011][Low]Arithmetic_underflow.md

## [VN-012][Medium]Inconsistency_across_Chains.md

Fixed - . Removed `setCustomNative` functions. Made `address custom` field deprecatec.