# Everscale bridge strategies

Here you can find information about all strategies used by bridge vaults.

## Convex3crv
### Intro
This strategy is a modified version of the yearn strategy that manages 3crv tokens
for use in the convex protocol. Main difference is that the Everscale bridge version
accepts not 3crv tokens, but the underlying stablecoins.

### Mechanic
Strategy's mechanic duplicates the original one, except that it accepts USDC/USDT/DAI instead of 3crv creating them on the fly.
Strategy unwraps 3crv to underlying coins if it is needed, for example to pay debt to vault.
Thus, the strategy can be connected to any vault using one of USDC / USDT / DAI coins.
The strategy's earnings consist of CVX and CRV tokens, which are exchanged for stablecoins and wrapped in 3crv
for recapitalization.

### Resources
[Original yearn strategy](https://yearn.watch/network/ethereum/vault/0x84E13785B5a27879921D6F685f041421C7F482dA/strategy/0xeC088B98e71Ba5FFAf520c2f6A6F0153f1bf494B)

[Convex Finance](https://www.convexfinance.com/stake)

[Curve 3crv pool](https://curve.fi/3pool/deposit)

## ConvexFrax
### Intro
This strategy is a modified version of the yearn strategy that manages 3crv-Frax curve lp tokens
for use in the convex protocol. Main difference is that the Everscale bridge version
accepts not lp tokens, but the underlying stablecoins (USDC/USDT/DAI).

### Mechanic
Strategy's mechanic duplicates the original one, except that it accepts USDC/USDT/DAI instead of 3crv-Frax lp creating them on the fly.
Strategy unwraps lp to underlying coins if it is needed, for example to pay debt to vault.
Thus, the strategy can be connected to any vault using one of USDC / USDT / DAI coins.
The strategy's earnings consist of CVX and CRV tokens, which are exchanged for stablecoins and wrapped in 3crv-Frax lp
for recapitalization.

### Resources
[Original yearn strategy](https://yearn.watch/network/ethereum/vault/0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139/strategy/0x5E1dCe90AB54382e3f66E0b245E07209798c171c)

[Convex Finance](https://www.convexfinance.com/stake)

[Curve 3crv pool](https://curve.fi/frax/deposit)

## ConvexBUSD
### Intro
This strategy is a modified version of the yearn strategy that manages 3crv-Frax curve lp tokens
for use in the convex protocol. Main difference is that the Everscale bridge version
accepts not lp tokens, but the underlying stablecoins (USDC/USDT/DAI) + 3crv-BUSD is used instead of 3crv-Frax

### Mechanic
Strategy's mechanic duplicates the original one, except that it accepts USDC/USDT/DAI instead of curve lp creating them on the fly.
Strategy unwraps lp to underlying coins if it is needed, for example to pay debt to vault.
Thus, the strategy can be connected to any vault using one of USDC / USDT / DAI coins.
The strategy's earnings consist of CVX and CRV tokens, which are exchanged for stablecoins and wrapped in 3crv-BUSD lp
for recapitalization.

### Resources
[Original yearn strategy](https://yearn.watch/network/ethereum/vault/0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139/strategy/0x5E1dCe90AB54382e3f66E0b245E07209798c171c)

[Convex Finance](https://www.convexfinance.com/stake)

[Curve 3crv pool](https://curve.fi/busdv2/deposit)
