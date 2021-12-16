# TON bridge strategies

Here you can find information about all strategies used by bridge vaults.

## Convex3crv
### Intro
This strategy is a modified version of the yearn strategy that manages 3crv tokens
for use in the convex protocol. Main difference is that the TON bridge version
accepts not 3crv tokens, but the underlying stablecoins.

### Mechanic
Strategy's mechanic duplicates the original one, except that it accepts USDC/USDT/DAI instead of 3crv creating them on the fly.
Strategy unwraps 3crv to underlying coins if it is needed, for example to pay debt to vault.
Thus, the strategy can be connected to a volta using any of the USDC / USDT / DAI coins.
The strategy's earnings consist of CVX and CRV tokens, which are exchanged for stablecoins and wrapped in 3crv
for recapitalization.

### Resources
[Original yearn strategy](https://yearn.watch/network/ethereum/vault/0x84E13785B5a27879921D6F685f041421C7F482dA/strategy/0xeC088B98e71Ba5FFAf520c2f6A6F0153f1bf494B)

[Convex Finance](https://www.convexfinance.com/stake)

[Curve 3crv pool](https://curve.fi/3pool/deposit)

