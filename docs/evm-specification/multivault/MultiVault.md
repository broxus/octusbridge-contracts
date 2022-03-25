# MultiVault





Vault, based on Octus Bridge. Allows to transfer arbitrary tokens from Everscale to EVM and backwards. Everscale tokens are called &quot;natives&quot; (eg QUBE). EVM tokens are called &quot;aliens&quot; (eg AAVE). Inspired by Yearn Vault V2.



## Methods

### acceptGovernance

```solidity
function acceptGovernance() external nonpayable
```

Once a new governance address has been proposed using `setGovernance`, this function may be called by the proposed address to accept the responsibility of taking over governance for this contract. This may only be called by the `pendingGovernance`.




### apiVersion

```solidity
function apiVersion() external pure returns (string api_version)
```

Vault API version. Used to track the deployed version of this contract.




#### Returns

| Name | Type | Description |
|---|---|---|
| api_version | string | undefined |

### blacklistAddToken

```solidity
function blacklistAddToken(address token) external nonpayable
```

Add token to blacklist. Only native token can be blacklisted. Blacklisted tokens cant be deposited or withdrawn.



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token address |

### blacklistRemoveToken

```solidity
function blacklistRemoveToken(address token) external nonpayable
```

Remove token from blacklist.



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token address |

### bridge

```solidity
function bridge() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### calculateMovementFee

```solidity
function calculateMovementFee(uint256 amount, address _token, enum IMultiVault.Fee fee) external view returns (uint256)
```

Calculates fee for deposit or withdrawal.



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | Amount of tokens. |
| _token | address | Token address. |
| fee | enum IMultiVault.Fee | Fee type (Deposit = 0, Withdraw = 1). |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### configurationAlien

```solidity
function configurationAlien() external view returns (struct IEverscale.EverscaleAddress)
```

Alien configuration address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | Everscale address, used for verifying alien withdrawals |

### configurationNative

```solidity
function configurationNative() external view returns (struct IEverscale.EverscaleAddress)
```

Native configuration address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | Everscale address, used for verifying native withdrawals |

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

### getChainID

```solidity
function getChainID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getNativeToken

```solidity
function getNativeToken(int8 native_wid, uint256 native_addr) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| native_wid | int8 | undefined |
| native_addr | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

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

Get native Everscale token address for EVM token



#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | Token address |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### rewards

```solidity
function rewards() external view returns (struct IEverscale.EverscaleAddress)
```

Rewards address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | Everscale address, used for collecting rewards. |

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

Save withdrawal for native token



#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Withdraw payload |
| signatures | bytes[] | Payload signatures |

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

Set default deposit fee.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultDepositFee | uint256 | Default deposit fee, should be less than FEE_LIMIT |

### setDefaultWithdrawFee

```solidity
function setDefaultWithdrawFee(uint256 _defaultWithdrawFee) external nonpayable
```

Set default withdraw fee.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultWithdrawFee | uint256 | Default withdraw fee, should be less than FEE_LIMIT |

### setEmergencyShutdown

```solidity
function setEmergencyShutdown(bool active) external nonpayable
```

Activates or deactivates MultiVault emergency shutdown.     During emergency shutdown:     - Deposits are disabled     - Withdrawals are disabled This may only be called by `governance` or `guardian`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| active | bool | If `true`, the MultiVault goes into Emergency Shutdown. If `false`, the MultiVault goes back into     Normal Operation. |

### setGovernance

```solidity
function setGovernance(address _governance) external nonpayable
```

Nominate new address to use as a governance. The change does not go into effect immediately. This function sets a pending change, and the governance address is not updated until the proposed governance address has accepted the responsibility. This may only be called by the `governance`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _governance | address | The address requested to take over Vault governance. |

### setGuardian

```solidity
function setGuardian(address _guardian) external nonpayable
```

Changes the address of `guardian`. This may only be called by `governance`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _guardian | address | The new guardian address to use. |

### setManagement

```solidity
function setManagement(address _management) external nonpayable
```

Changes the management address. This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _management | address | The address to use for management. |

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

Set deposit fee for specific token. This may be called only by `owner` or `management`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token address |
| _depositFee | uint256 | Deposit fee, must be less than FEE_LIMIT. |

### setTokenWithdrawFee

```solidity
function setTokenWithdrawFee(address token, uint256 _withdrawFee) external nonpayable
```

Set withdraw fee for specific token. This may be called only by `governance` or `management`



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token address, must be enabled |
| _withdrawFee | uint256 | Withdraw fee, must be less than FEE_LIMIT. |

### tokens

```solidity
function tokens(address _token) external view returns (struct IMultiVault.Token)
```

Get token information



#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | Token address |

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



