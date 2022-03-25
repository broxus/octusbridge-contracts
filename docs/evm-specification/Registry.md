# Registry









## Methods

### banksy

```solidity
function banksy(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### bridge

```solidity
function bridge() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### endorseVault

```solidity
function endorseVault(address vault, uint256 vaultReleaseDelta) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault | address | undefined |
| vaultReleaseDelta | uint256 | undefined |

### isRegistered

```solidity
function isRegistered(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### latestVault

```solidity
function latestVault(address token) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### latestVaultRelease

```solidity
function latestVaultRelease() external view returns (string api_version)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| api_version | string | undefined |

### newExperimentalVault

```solidity
function newExperimentalVault(address token, address governance, uint256 targetDecimals, uint256 vaultReleaseDelta) external nonpayable returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| governance | address | undefined |
| targetDecimals | uint256 | undefined |
| vaultReleaseDelta | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### newVault

```solidity
function newVault(address token, uint256 targetDecimals, uint256 vaultReleaseDelta) external nonpayable returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| targetDecimals | uint256 | undefined |
| vaultReleaseDelta | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### newVaultRelease

```solidity
function newVaultRelease(address vault) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault | address | undefined |

### numTokens

```solidity
function numTokens() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### numVaultReleases

```solidity
function numVaultReleases() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### numVaults

```solidity
function numVaults(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### proxyAdmin

```solidity
function proxyAdmin() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### rewards

```solidity
function rewards() external view returns (int8 wid, uint256 addr)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| wid | int8 | undefined |
| addr | uint256 | undefined |

### setBanksy

```solidity
function setBanksy(address tagger, bool allowed) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tagger | address | undefined |
| allowed | bool | undefined |

### setBridge

```solidity
function setBridge(address _bridge) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _bridge | address | undefined |

### setProxyAdmin

```solidity
function setProxyAdmin(address _proxyAdmin) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _proxyAdmin | address | undefined |

### setRewards

```solidity
function setRewards(IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _rewards | IEverscale.EverscaleAddress | undefined |

### tagVault

```solidity
function tagVault(address vault, string tag) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault | address | undefined |
| tag | string | undefined |

### tags

```solidity
function tags(address) external view returns (string)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### vaultReleases

```solidity
function vaultReleases(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |



## Events

### NewExperimentalVault

```solidity
event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token `indexed` | address | undefined |
| deployer `indexed` | address | undefined |
| vault  | address | undefined |
| api_version  | string | undefined |

### NewVault

```solidity
event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token `indexed` | address | undefined |
| vault_id `indexed` | uint256 | undefined |
| vault  | address | undefined |
| api_version  | string | undefined |

### NewVaultRelease

```solidity
event NewVaultRelease(uint256 indexed vault_release_id, address template, string api_version)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault_release_id `indexed` | uint256 | undefined |
| template  | address | undefined |
| api_version  | string | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### VaultTagged

```solidity
event VaultTagged(address vault, string tag)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault  | address | undefined |
| tag  | string | undefined |



