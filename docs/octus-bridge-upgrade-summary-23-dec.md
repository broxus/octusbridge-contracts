# Обновление контрактов octusbridge.io (23 декабря 2022)

В каждой подключенной EVM сети существует два типа контрактов:

- Отдельный контракт Vault для каждого подключенного токена (USDT / USDC / WETH / ...).
- Контракт MultiVault, позволяющие переводить любые ERC20 токены через бридж

Во время второй фазы обновления, все контракты типа Vault будут закрыты, их ликвидность будет переведена на MultiVault.
MultiVault станет единым контрактом для трансферов любых токенов через бридж.

## Резюме

До обновления, для проведения кредитного депозита, использовалась функция `Vault.depositToFactory`.
В параметрах вызова указывалось, какая часть депозита будет использована для оплаты газа на стороне Everscale.

В процессе обновления, отдельная функция для кредитных депозитов была удалена.
Теперь все депозиты производятся через одну функцию - `MultiVault.deposit(DepositParams memory d)` (параметры описаны ниже).
Для кредитного перехода, нужно приложить нативные токены (ETH / BNB / MATIC / ...) к вызову функции депозита.
Шаг депозита на стороне Everscale будет завершен автоматически, пользователь получит эквивалент приложенных токенов в EVERs.

## Ссылки

- [Deposit facet ABI](./../ethereum/abi/MultiVaultFacetDeposit.json)
- [Deposit facet code](./../ethereum/contracts/multivault/multivault/facets/MultiVaultFacetDeposit.sol)

## Параметры депозита

```solidity
struct DepositParams {
    IEverscale.EverscaleAddress recipient;
    address token;
    uint amount;
    uint expected_evers;
    bytes payload;
}
```

### `IEverscale.EverscaleAddress recipient`

Адрес получателя токенов в сети Everscale

### `address token`

Адрес депонируемого токена в EVM сети

### `uint amount`

Количество депонируемых токенов

### `uint expected_evers`

Количество EVER, которые должны . После подтверждения эвента, оставшиеся EVERs будут отправлены на `recipient`.
Приложенная к вызову `deposit` нативная валюта пересчитывается по курсам:

- пара EVER / USDT на [app.flatqube.io](app.flatqube.io)
- пары ETH/BNB/MATIC/AVAX/FANTOM / USDT на Chainlink в сети Polygon

Если приложенных нативных токенов не достаточно, то эвент контракт не будет создан. Для финализации трансфера
необходимо задеплоить этот контракт самостоятельно.

### `bytes payload`

Пейлоад, упакованный в формате валидного TvmCell.
Будет приложен к колбеку onAcceptTokensTransfer / onAcceptTokensMint.
Может быть пустым.

