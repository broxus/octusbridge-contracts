# IBridge









## Methods

### banRelays

```solidity
function banRelays(address[] _relays) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | address[] | undefined |

### forceRoundRelays

```solidity
function forceRoundRelays(uint160[] _relays, uint32 roundEnd) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | uint160[] | undefined |
| roundEnd | uint32 | undefined |

### isBanned

```solidity
function isBanned(address candidate) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| candidate | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isRelay

```solidity
function isRelay(uint32 round, address candidate) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| round | uint32 | undefined |
| candidate | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isRoundRotten

```solidity
function isRoundRotten(uint32 round) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| round | uint32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### pause

```solidity
function pause() external nonpayable
```






### setConfiguration

```solidity
function setConfiguration(IEverscale.EverscaleAddress _roundRelaysConfiguration) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundRelaysConfiguration | IEverscale.EverscaleAddress | undefined |

### setRoundRelays

```solidity
function setRoundRelays(bytes payload, bytes[] signatures) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

### setRoundSubmitter

```solidity
function setRoundSubmitter(address _roundSubmitter) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundSubmitter | address | undefined |

### unbanRelays

```solidity
function unbanRelays(address[] _relays) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | address[] | undefined |

### unpause

```solidity
function unpause() external nonpayable
```






### updateMinimumRequiredSignatures

```solidity
function updateMinimumRequiredSignatures(uint32 _minimumRequiredSignatures) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _minimumRequiredSignatures | uint32 | undefined |

### updateRoundTTL

```solidity
function updateRoundTTL(uint32 _roundTTL) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundTTL | uint32 | undefined |

### verifySignedEverscaleEvent

```solidity
function verifySignedEverscaleEvent(bytes payload, bytes[] signatures) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |



## Events

### BanRelay

```solidity
event BanRelay(address indexed relay, bool status)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| relay `indexed` | address | undefined |
| status  | bool | undefined |

### EmergencyShutdown

```solidity
event EmergencyShutdown(bool active)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| active  | bool | undefined |

### NewRound

```solidity
event NewRound(uint32 indexed round, IBridge.Round meta)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| round `indexed` | uint32 | undefined |
| meta  | IBridge.Round | undefined |

### RoundRelay

```solidity
event RoundRelay(uint32 indexed round, address indexed relay)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| round `indexed` | uint32 | undefined |
| relay `indexed` | address | undefined |

### UpdateMinimumRequiredSignatures

```solidity
event UpdateMinimumRequiredSignatures(uint32 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| value  | uint32 | undefined |

### UpdateRoundRelaysConfiguration

```solidity
event UpdateRoundRelaysConfiguration(IEverscale.EverscaleAddress configuration)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| configuration  | IEverscale.EverscaleAddress | undefined |

### UpdateRoundSubmitter

```solidity
event UpdateRoundSubmitter(address _roundSubmitter)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundSubmitter  | address | undefined |

### UpdateRoundTTL

```solidity
event UpdateRoundTTL(uint32 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| value  | uint32 | undefined |



