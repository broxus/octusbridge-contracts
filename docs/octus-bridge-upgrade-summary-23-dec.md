# Обновление контрактов octusbridge.io (23 декабря 2022)

## Резюме

До обновления, для проведения кредитного депозита, использовалась функция `depositToFactory`.
В параметрах вызова указывалось, какая часть депозита будет использована для оплаты газа на стороне Everscale.

В процессе обновления, отдельная функция для кредитных депозитов была удалена.
Теперь все депозиты производятся через одну функцию - `deposit(DepositParams memory d)` (параметры описаны ниже).
Для кредитного перехода, нужно приложить нативные токены (ETH / BNB / MATIC / ...) к вызову функции депозита.

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

### `bytes payload`

Пейлоад, упакованный в формате валидного TvmCell.
Будет приложен к колбеку onAcceptTokensTransfer / onAcceptTokensMint.
Может быть пустым.

