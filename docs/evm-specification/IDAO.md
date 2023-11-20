# IDAO









## Methods

### decodeEthActionsEventData

```solidity
function decodeEthActionsEventData(bytes payload) external pure returns (int8 _wid, uint256 _addr, uint32 chainId, struct IDAO.EthAction[] actions)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _wid | int8 | undefined |
| _addr | uint256 | undefined |
| chainId | uint32 | undefined |
| actions | IDAO.EthAction[] | undefined |

### execute

```solidity
function execute(bytes payload, bytes[] signatures) external nonpayable returns (bytes[] responses)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| responses | bytes[] | undefined |

### setBridge

```solidity
function setBridge(address _bridge) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _bridge | address | undefined |

### setConfiguration

```solidity
function setConfiguration(IEverscale.EverscaleAddress _configuration) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _configuration | IEverscale.EverscaleAddress | undefined |



## Events

### UpdateBridge

```solidity
event UpdateBridge(address indexed bridge)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| bridge `indexed` | address | undefined |

### UpdateConfiguration

```solidity
event UpdateConfiguration(IEverscale.EverscaleAddress configuration)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| configuration  | IEverscale.EverscaleAddress | undefined |



