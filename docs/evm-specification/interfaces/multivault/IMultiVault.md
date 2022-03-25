# IMultiVault









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

### blacklistAddToken

```solidity
function blacklistAddToken(address token) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

### blacklistRemoveToken

```solidity
function blacklistRemoveToken(address token) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

### bridge

```solidity
function bridge() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### configurationAlien

```solidity
function configurationAlien() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### configurationNative

```solidity
function configurationNative() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### defaultDepositFee

```solidity
function defaultDepositFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### defaultWithdrawFee

```solidity
function defaultWithdrawFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### deposit

```solidity
function deposit(IEverscale.EverscaleAddress recipient, address token, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| token | address | undefined |
| amount | uint256 | undefined |

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

### initialize

```solidity
function initialize(address _bridge, address _governance, IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _bridge | address | undefined |
| _governance | address | undefined |
| _rewards | IEverscale.EverscaleAddress | undefined |

### management

```solidity
function management() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### migrateAlienTokenToVault

```solidity
function migrateAlienTokenToVault(address token, address vault) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| vault | address | undefined |

### natives

```solidity
function natives(address _token) external view returns (struct IEverscale.EverscaleAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### rewards

```solidity
function rewards() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### saveWithdrawAlien

```solidity
function saveWithdrawAlien(bytes payload, bytes[] signatures) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

### saveWithdrawNative

```solidity
function saveWithdrawNative(bytes payload, bytes[] signatures) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

### setConfigurationAlien

```solidity
function setConfigurationAlien(IEverscale.EverscaleAddress _configuration) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _configuration | IEverscale.EverscaleAddress | undefined |

### setConfigurationNative

```solidity
function setConfigurationNative(IEverscale.EverscaleAddress _configuration) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _configuration | IEverscale.EverscaleAddress | undefined |

### setDefaultDepositFee

```solidity
function setDefaultDepositFee(uint256 _defaultDepositFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultDepositFee | uint256 | undefined |

### setDefaultWithdrawFee

```solidity
function setDefaultWithdrawFee(uint256 _defaultWithdrawFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultWithdrawFee | uint256 | undefined |

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

### setTokenDepositFee

```solidity
function setTokenDepositFee(address token, uint256 _depositFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| _depositFee | uint256 | undefined |

### setTokenWithdrawFee

```solidity
function setTokenWithdrawFee(address token, uint256 _withdrawFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| _withdrawFee | uint256 | undefined |

### tokens

```solidity
function tokens(address _token) external view returns (struct IMultiVault.Token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IMultiVault.Token | undefined |

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

### AlienTransfer

```solidity
event AlienTransfer(uint256 base_chainId, uint160 base_token, string name, string symbol, uint8 decimals, uint128 amount, int8 recipient_wid, uint256 recipient_addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| base_chainId  | uint256 | undefined |
| base_token  | uint160 | undefined |
| name  | string | undefined |
| symbol  | string | undefined |
| decimals  | uint8 | undefined |
| amount  | uint128 | undefined |
| recipient_wid  | int8 | undefined |
| recipient_addr  | uint256 | undefined |

### BlacklistTokenAdded

```solidity
event BlacklistTokenAdded(address token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |

### BlacklistTokenRemoved

```solidity
event BlacklistTokenRemoved(address token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |

### Deposit

```solidity
event Deposit(enum IMultiVault.TokenType _type, address sender, address token, int8 recipient_wid, uint256 recipient_addr, uint256 amount, uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _type  | enum IMultiVault.TokenType | undefined |
| sender  | address | undefined |
| token  | address | undefined |
| recipient_wid  | int8 | undefined |
| recipient_addr  | uint256 | undefined |
| amount  | uint256 | undefined |
| fee  | uint256 | undefined |

### EmergencyShutdown

```solidity
event EmergencyShutdown(bool active)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| active  | bool | undefined |

### NativeTransfer

```solidity
event NativeTransfer(int8 native_wid, uint256 native_addr, uint128 amount, int8 recipient_wid, uint256 recipient_addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| native_wid  | int8 | undefined |
| native_addr  | uint256 | undefined |
| amount  | uint128 | undefined |
| recipient_wid  | int8 | undefined |
| recipient_addr  | uint256 | undefined |

### NewPendingGovernance

```solidity
event NewPendingGovernance(address governance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| governance  | address | undefined |

### TokenActivated

```solidity
event TokenActivated(address token, uint256 activation, bool isNative, uint256 depositFee, uint256 withdrawFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| activation  | uint256 | undefined |
| isNative  | bool | undefined |
| depositFee  | uint256 | undefined |
| withdrawFee  | uint256 | undefined |

### TokenCreated

```solidity
event TokenCreated(address token, int8 native_wid, uint256 native_addr, string name, string symbol, uint8 decimals)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| native_wid  | int8 | undefined |
| native_addr  | uint256 | undefined |
| name  | string | undefined |
| symbol  | string | undefined |
| decimals  | uint8 | undefined |

### TokenMigrated

```solidity
event TokenMigrated(address token, address vault)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| vault  | address | undefined |

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
event UpdateConfiguration(enum IMultiVault.TokenType _type, int128 wid, uint256 addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _type  | enum IMultiVault.TokenType | undefined |
| wid  | int128 | undefined |
| addr  | uint256 | undefined |

### UpdateDefaultDepositFee

```solidity
event UpdateDefaultDepositFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateDefaultWithdrawFee

```solidity
event UpdateDefaultWithdrawFee(uint256 fee)
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

### UpdateTokenDepositFee

```solidity
event UpdateTokenDepositFee(address token, uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| fee  | uint256 | undefined |

### UpdateTokenWithdrawFee

```solidity
event UpdateTokenWithdrawFee(address token, uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| fee  | uint256 | undefined |

### Withdraw

```solidity
event Withdraw(enum IMultiVault.TokenType _type, bytes32 payloadId, address token, address recipient, uint256 amunt, uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _type  | enum IMultiVault.TokenType | undefined |
| payloadId  | bytes32 | undefined |
| token  | address | undefined |
| recipient  | address | undefined |
| amunt  | uint256 | undefined |
| fee  | uint256 | undefined |



