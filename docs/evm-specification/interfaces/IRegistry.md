# IRegistry










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

### VaultTagged

```solidity
event VaultTagged(address vault, string tag)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| vault  | address | undefined |
| tag  | string | undefined |



