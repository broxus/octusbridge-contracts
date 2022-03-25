# IVaultBasic









## Methods

### acceptGovernance

```solidity
function acceptGovernance() external nonpayable
```






### apiVersion

```solidity
function apiVersion() external view returns (string api_version)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| api_version | string | undefined |

### bridge

```solidity
function bridge() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### configuration

```solidity
function configuration() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### decodeWithdrawalEventData

```solidity
function decodeWithdrawalEventData(bytes eventData) external view returns (struct IVaultBasic.WithdrawalParams)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| eventData | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVaultBasic.WithdrawalParams | undefined |

### deposit

```solidity
function deposit(IEverscale.EverscaleAddress recipient, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256 | undefined |

### depositFee

```solidity
function depositFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### emergencyShutdown

```solidity
function emergencyShutdown() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### governance

```solidity
function governance() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### guardian

```solidity
function guardian() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### management

```solidity
function management() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### rewards

```solidity
function rewards() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### setConfiguration

```solidity
function setConfiguration(IEverscale.EverscaleAddress _configuration) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _configuration | IEverscale.EverscaleAddress | undefined |

### setDepositFee

```solidity
function setDepositFee(uint256 _depositFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositFee | uint256 | undefined |

### setEmergencyShutdown

```solidity
function setEmergencyShutdown(bool active) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| active | bool | undefined |

### setGovernance

```solidity
function setGovernance(address _governance) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _governance | address | undefined |

### setGuardian

```solidity
function setGuardian(address _guardian) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _guardian | address | undefined |

### setManagement

```solidity
function setManagement(address _management) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _management | address | undefined |

### setRewards

```solidity
function setRewards(IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _rewards | IEverscale.EverscaleAddress | undefined |

### setWithdrawFee

```solidity
function setWithdrawFee(uint256 _withdrawFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawFee | uint256 | undefined |

### sweep

```solidity
function sweep(address _token) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined |

### targetDecimals

```solidity
function targetDecimals() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### token

```solidity
function token() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### tokenDecimals

```solidity
function tokenDecimals() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### withdrawFee

```solidity
function withdrawFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### withdrawalIds

```solidity
function withdrawalIds(bytes32) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |



## Events

### Deposit

```solidity
event Deposit(uint256 amount, int128 wid, uint256 addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount  | uint256 | undefined |
| wid  | int128 | undefined |
| addr  | uint256 | undefined |

### EmergencyShutdown

```solidity
event EmergencyShutdown(bool active)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| active  | bool | undefined |

### InstantWithdrawal

```solidity
event InstantWithdrawal(bytes32 payloadId, address recipient, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payloadId  | bytes32 | undefined |
| recipient  | address | undefined |
| amount  | uint256 | undefined |

### NewPendingGovernance

```solidity
event NewPendingGovernance(address governance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| governance  | address | undefined |

### UpdateBridge

```solidity
event UpdateBridge(address bridge)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| bridge  | address | undefined |

### UpdateConfiguration

```solidity
event UpdateConfiguration(int128 wid, uint256 addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| wid  | int128 | undefined |
| addr  | uint256 | undefined |

### UpdateDepositFee

```solidity
event UpdateDepositFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateGovernance

```solidity
event UpdateGovernance(address governance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| governance  | address | undefined |

### UpdateGuardian

```solidity
event UpdateGuardian(address guardian)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| guardian  | address | undefined |

### UpdateManagement

```solidity
event UpdateManagement(address management)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| management  | address | undefined |

### UpdateRewards

```solidity
event UpdateRewards(int128 wid, uint256 addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| wid  | int128 | undefined |
| addr  | uint256 | undefined |

### UpdateTargetDecimals

```solidity
event UpdateTargetDecimals(uint256 targetDecimals)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| targetDecimals  | uint256 | undefined |

### UpdateWithdrawFee

```solidity
event UpdateWithdrawFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |



