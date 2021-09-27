# Список изменений по бриджу и стейкингу

## Бридж

### Админские функции

- Удалить из релеев все функции про создание конфигураций, голосование и прочее

### Вывод списка подключенных эвент конфигураций через коннектор

- Из бриджа удален маппинг с подключенными эвент конфигурациями
- Теперь для этих целей используется контракт `Connector`
- Пайплайн для построения перечня подключенных эвент конфигураций при первом запуске релея:
1. Запросить у бриджа число задеплоенных коннекторов (`Bridge.connectorCounter`)
    1. По каждому айдишнику от 0 до `connectorCounter` вывести адрес коннектора (`Bridge.deriveConnectorAddress`)
    2. В каждом коннекторе получить детали `Connector.getDetails`
- После первичной инициализации релей подписывается на событие `Bridge.ConnectorDeployed` и мониторит новые коннекторы

### Подпись ton-eth эвента

- Изменилась эфировская структура ton event, которую подписывают релеи. [Ссылка](../ethereum/contracts/interfaces/IBridge.sol)

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

- Каждая эвент конфигурация имеет функцию для деплоя эвент контракта по эвент данным (`deployEvent`)
- Изменилось поведение релея при обнаружении подходящего эвента
    1. Теперь пользователь сам и за свой счет деплоит эвент контракт
    2. Релей должен вывести соответствующий адрес эвент контракта из данных эвента и ждать пока эвент контракт не будет задеплоен
    3. Как только эвент контракт задеплоен - релей отправляет подтверждение

### Эвент контракты

- Релеи больше не пользуются аккаунтами - confirm / reject это ext in сообщения с публичным ключом релея
- Confirm / reject направляются напрямую в эвент контракт
- Релеи должны голосовать за ton-eth эвент даже если необходимое число подтверждений уже набрано. Релей не должен
голосовать за ton-eth эвент только если он уже проголосовал, или если эвент перешел в статус `Closed`

### Стейкинг

TODO
