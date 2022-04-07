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

### defaultAlienDepositFee

```solidity
function defaultAlienDepositFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### defaultAlienWithdrawFee

```solidity
function defaultAlienWithdrawFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### defaultNativeDepositFee

```solidity
function defaultNativeDepositFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### defaultNativeWithdrawFee

```solidity
function defaultNativeWithdrawFee() external view returns (uint256)
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

### fees

```solidity
function fees(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getInitHash

```solidity
function getInitHash() external pure returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

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
function initialize(address _bridge, address _governance) external nonpayable
```

MultiVault initializer



#### Parameters

| Name | Type | Description |
|---|---|---|
| _bridge | address | Bridge address |
| _governance | address | Governance address |

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

### prefixes

```solidity
function prefixes(address _token) external view returns (struct IMultiVault.TokenPrefix)
```

Get token prefix

*Used to set up in advance prefix for the ERC20 native token*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | Token address |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IMultiVault.TokenPrefix | Name and symbol prefix |

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

### setDefaultAlienDepositFee

```solidity
function setDefaultAlienDepositFee(uint256 fee) external nonpayable
```

Set default deposit fee for alien tokens. Charged on the `deposit`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | Fee amount, should be less than FEE_LIMIT |

### setDefaultAlienWithdrawFee

```solidity
function setDefaultAlienWithdrawFee(uint256 fee) external nonpayable
```

Set default withdraw fee for alien tokens. Charged on the `saveWithdrawAlien`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | Fee amount, should be less than FEE_LIMIT |

### setDefaultNativeDepositFee

```solidity
function setDefaultNativeDepositFee(uint256 fee) external nonpayable
```

Set default deposit fee for native tokens. Charged on the `deposit`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | Fee amount, should be less than FEE_LIMIT |

### setDefaultNativeWithdrawFee

```solidity
function setDefaultNativeWithdrawFee(uint256 fee) external nonpayable
```

Set default withdraw fee for native tokens. Charged on the `saveWithdrawNative`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | Fee amount, should be less than FEE_LIMIT |

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

### setPrefix

```solidity
function setPrefix(address token, string name_prefix, string symbol_prefix) external nonpayable
```

Set prefix for native token



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Expected native token address, see note on `getNative` |
| name_prefix | string | Name prefix, leave empty for no-prefix |
| symbol_prefix | string | Symbol prefix, leave empty for no-prefix |

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

### skim

```solidity
function skim(address token, bool skim_to_everscale) external nonpayable
```

Skim multivault fees for specific token

*If `skim_to_everscale` is true, than fees will be sent to Everscale. Token type will be derived automatically and transferred with correct pipeline to the `rewards`. Otherwise, tokens will be transferred to the `governance` address. Can be called only by governance or management.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Token address, can be both native or alien |
| skim_to_everscale | bool | Skim fees to Everscale or not |

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

### SkimFee

```solidity
event SkimFee(address token, bool skim_to_everscale, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| skim_to_everscale  | bool | undefined |
| amount  | uint256 | undefined |

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
event TokenCreated(address token, int8 native_wid, uint256 native_addr, string name_prefix, string symbol_prefix, string name, string symbol, uint8 decimals)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| native_wid  | int8 | undefined |
| native_addr  | uint256 | undefined |
| name_prefix  | string | undefined |
| symbol_prefix  | string | undefined |
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

### UpdateDefaultAlienDepositFee

```solidity
event UpdateDefaultAlienDepositFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateDefaultAlienWithdrawFee

```solidity
event UpdateDefaultAlienWithdrawFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateDefaultNativeDepositFee

```solidity
event UpdateDefaultNativeDepositFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateDefaultNativeWithdrawFee

```solidity
event UpdateDefaultNativeWithdrawFee(uint256 fee)
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

### UpdateTokenPrefix

```solidity
event UpdateTokenPrefix(address token, string name_prefix, string symbol_prefix)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| name_prefix  | string | undefined |
| symbol_prefix  | string | undefined |

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
event Withdraw(enum IMultiVault.TokenType _type, bytes32 payloadId, address token, address recipient, uint256 amount, uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _type  | enum IMultiVault.TokenType | undefined |
| payloadId  | bytes32 | undefined |
| token  | address | undefined |
| recipient  | address | undefined |
| amount  | uint256 | undefined |
| fee  | uint256 | undefined |



