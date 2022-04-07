# IDAO









## Methods

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



