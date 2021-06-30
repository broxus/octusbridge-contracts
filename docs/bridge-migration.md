# Список изменений по бриджу и стейкингу

## Бридж

### Админские функции

- Создание голосования, удаление, изменение эвент конфигураций в бридже полностью перенесен на дао

### Подпись ton-eth эвента

- Изменилась эфировская структура ton event, которую подписывают релеи. [Ссылка](../ethereum/contracts/interfaces/IBridge.sol)

### Эвент контракты

- Релеи больше не пользуются аккаунтами - confirm / reject это ext in сообщения с публичным ключом релея
- Confirm / reject направляются напрямую в эвент контракт
- Релеи должны голосовать за ton-eth эвент даже если необходимое число подтверждений уже набрано

### Эвент конфигурации

- Каждая эвент конфигурация имеет функцию для вывода адреса эвент контракта - `deriveEventAddress` ([Ссылка](../free-ton/contracts/bridge/event-configuration-contracts/EthereumEventConfiguration.sol))
- Изменилась структура и названия данных конфигурации

```
contract EthereumEventConfiguration is IEthereumEventConfiguration, IProxy, TransferUtils, InternalOwner, CheckPubKey {
    BasicConfiguration public static basicConfiguration;
    EthereumEventConfiguration public static networkConfiguration;
```

[BasicConfiguration](./../free-ton/contracts/bridge/interfaces/event-configuration-contracts/IBasicEventConfiguration.sol),
[EthereumEventConfiguration](./../free-ton/contracts/bridge/interfaces/event-configuration-contracts/IEthereumEventConfiguration.sol),
[TonEventConfiguration](./../free-ton/contracts/bridge/interfaces/event-configuration-contracts/ITonEventConfiguration.sol)

- Каждая эвент конфигурация имеет функцию для деплоя эвент контракта по эвент данным (`deployEvent`).
Для деплоя пользователь должен приложить к вызову не менее `basicConfiguration.eventInitialBalance`

### Стейкинг

TODO
