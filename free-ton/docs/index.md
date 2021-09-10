
# Bridge
**Path**: [contracts/bridge/Bridge.sol](./../contracts/bridge/Bridge.sol)

**Title**: Bridge contract


**Details**: Deploys connectors. Entry point for relay sync.


**Author**: https://github.com/pavlovdog


## constructor


### Params
| Index | Name                 | Description                  |
| ----- | -------------------- | ---------------------------- |
| 0     | _owner               | Owner address                |
| 1     | _bridgeConfiguration | Initial Bridge configuration |




## deployConnector(address)

**Details**: Deploy new connector.


### Params
| Index | Name                | Description                            |
| ----- | ------------------- | -------------------------------------- |
| 0     | _eventConfiguration | Event configuration address to connect |



### Returns
| Index | Name      | Description                |
| ----- | --------- | -------------------------- |
| 0     | connector | Expected connector address |



## deriveConnectorAddress(uint128)

**Details**: Derive connector address by it&#39;s id


### Params
| Index | Name  | Description  |
| ----- | ----- | ------------ |
| 0     | id    | Connector id |




## updateBridgeConfiguration((address,bool,TvmCell,uint128))

**Details**: Update bridge configuration


### Params
| Index | Name                 | Description              |
| ----- | -------------------- | ------------------------ |
| 0     | _bridgeConfiguration | New bridge configuration |





# EthereumEvent
**Path**: [contracts/bridge/event-contracts/EthereumEvent.sol](../contracts/bridge/event-contracts/token-transfer/TokenTransferEthereumEvent.sol)

**Title**: Basic example of Ethereum event configuration


**Details**: Anyone can deploy it for specific event. Relays send their rejects / confirms with external message directly into this contract. In case enough confirmations is collected - callback is executed. This implementation is used for cross chain token transfers



## confirm()

**Details**: Confirm event. Can be called only by relay which is in charge at this round. Can be called only when event configuration is in Pending status




## constructor

**Details**: Should be deployed only by corresponding EthereumEventConfiguration contract


### Params
| Index | Name         | Description                                                                                                         |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| 0     | _initializer | The address who paid for contract deployment. Receives all contract balance at the end of event contract lifecycle. |




## getDetails()

**Details**: Get event details



### Returns
| Index | Name           | Description                                                                                          |
| ----- | -------------- | ---------------------------------------------------------------------------------------------------- |
| 0     | _eventInitData | Init data                                                                                            |
| 1     | _initializer   | Account who has deployed this contract                                                               |
| 2     | _meta          | Meta data from the corresponding event configuration                                                 |
| 3     | _requiredVotes | The required amount of votes to confirm / reject event. Basically it&#39;s 2/3 + 1 relays for this round |
| 4     | _status        | Current event status                                                                                 |
| 5     | balance        | This contract&#39;s balance                                                                              |
| 6     | confirms       | List of relays who have confirmed event                                                              |
| 7     | empty          | List of relays who have not voted                                                                    |
| 8     | rejects        | List of relays who have rejected event                                                               |



## reject()

**Details**: Reject event. Can be called only by relay which is in charge at this round. Can be called only when event configuration is in Pending status. If enough rejects collected changes status to Rejected, notifies tokens receiver and withdraw balance to initializer.





# EthereumEventConfiguration
**Path**: [contracts/bridge/event-configuration-contracts/EthereumEventConfiguration.sol](./../contracts/bridge/event-configuration-contracts/EthereumEventConfiguration.sol)

**Title**: Basic Ethereum event configuration contract.



**Author**: https://github.com/pavlovdog


## broxusBridgeCallback(((uint256,uint32,TvmCell,uint32,uint256),address,address,uint32),address)

**Details**: Receives execute callback from ethereum event and send it to the event proxy contract. Ethereum event correctness is checked here, so event proxy contract becomes more simple


### Params
| Index | Name           | Description                           |
| ----- | -------------- | ------------------------------------- |
| 0     | eventInitData  | Ethereum event data                   |
| 1     | gasBackAddress | Ad hoc param. Used in token transfers |




## constructor


### Params
| Index | Name   | Description               |
| ----- | ------ | ------------------------- |
| 0     | _owner | Event configuration owner |




## deployEvent((uint256,uint32,TvmCell,uint32,uint256))


### Params
| Index | Name          | Description     |
| ----- | ------------- | --------------- |
| 0     | eventVoteData | Event vote data |




## deriveEventAddress((uint256,uint32,TvmCell,uint32,uint256))


### Params
| Index | Name          | Description              |
| ----- | ------------- | ------------------------ |
| 0     | eventVoteData | Ethereum event vote data |



### Returns
| Index | Name          | Description                                          |
| ----- | ------------- | ---------------------------------------------------- |
| 0     | eventContract | Address of the corresponding ethereum event contract |



## update((bytes,address,uint128,TvmCell,TvmCell,uint32),(uint160,uint16,address,uint32))

**Details**: Update configuration data


### Params
| Index | Name                  | Description                                  |
| ----- | --------------------- | -------------------------------------------- |
| 0     | _basicConfiguration   | New basic configuration init data            |
| 1     | _networkConfiguration | New network specific configuration init data |





# TonEvent
**Path**: [contracts/bridge/event-contracts/TonEvent.sol](../contracts/bridge/event-contracts/token-transfer/TokenTransferTonEvent.sol)





# TonEventConfiguration
**Path**: [contracts/bridge/event-configuration-contracts/TonEventConfiguration.sol](./../contracts/bridge/event-configuration-contracts/TonEventConfiguration.sol)




