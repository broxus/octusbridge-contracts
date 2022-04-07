# Vault

*https://github.com/broxus*

> Vault contract. Entry point for the Octus bridge cross chain token transfers.



*Fork of the Yearn Vault V2 contract, rewritten in Solidity.*

## Methods

### acceptGovernance

```solidity
function acceptGovernance() external nonpayable
```

Once a new governance address has been proposed using `setGovernance`, this function may be called by the proposed address to accept the responsibility of taking over governance for this contract. This may only be called by the `pendingGovernance`.




### addStrategy

```solidity
function addStrategy(address strategyId, uint256 _debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 _performanceFee) external nonpayable
```

Add a Strategy to the Vault This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | The address of the Strategy to add. |
| _debtRatio | uint256 | The share of the total assets in the `vault that the `strategy` has access to. |
| minDebtPerHarvest | uint256 | Lower limit on the increase of debt since last harvest. |
| maxDebtPerHarvest | uint256 | Upper limit on the increase of debt since last harvest. |
| _performanceFee | uint256 | The fee the strategist will receive based on this Vault&#39;s performance. |

### apiVersion

```solidity
function apiVersion() external pure returns (string api_version)
```

Vault API version. Used to track the deployed version of this contract.




#### Returns

| Name | Type | Description |
|---|---|---|
| api_version | string | Current API version |

### availableDepositLimit

```solidity
function availableDepositLimit() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### bridge

```solidity
function bridge() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### cancelPendingWithdrawal

```solidity
function cancelPendingWithdrawal(uint256 id, uint256 amount, IEverscale.EverscaleAddress recipient, uint256 bounty) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |
| amount | uint256 | undefined |
| recipient | IEverscale.EverscaleAddress | undefined |
| bounty | uint256 | undefined |

### configuration

```solidity
function configuration() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### convertFromTargetDecimals

```solidity
function convertFromTargetDecimals(uint256 amount) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### convertToTargetDecimals

```solidity
function convertToTargetDecimals(uint256 amount) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### creditAvailable

```solidity
function creditAvailable() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### creditAvailable

```solidity
function creditAvailable(address strategyId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### debtOutstanding

```solidity
function debtOutstanding(address strategyId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### debtOutstanding

```solidity
function debtOutstanding() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### debtRatio

```solidity
function debtRatio() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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
function deposit(IEverscale.EverscaleAddress recipient, uint256 amount, IVault.PendingWithdrawalId pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256 | undefined |
| pendingWithdrawalId | IVault.PendingWithdrawalId | undefined |

### deposit

```solidity
function deposit(IEverscale.EverscaleAddress recipient, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256 | undefined |

### deposit

```solidity
function deposit(IEverscale.EverscaleAddress recipient, uint256[] amount, IVault.PendingWithdrawalId[] pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256[] | undefined |
| pendingWithdrawalId | IVault.PendingWithdrawalId[] | undefined |

### depositFee

```solidity
function depositFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### depositLimit

```solidity
function depositLimit() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### depositToFactory

```solidity
function depositToFactory(uint128 amount, int8 wid, uint256 user, uint256 creditor, uint256 recipient, uint128 tokenAmount, uint128 tonAmount, uint8 swapType, uint128 slippageNumerator, uint128 slippageDenominator, bytes level3) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint128 | undefined |
| wid | int8 | undefined |
| user | uint256 | undefined |
| creditor | uint256 | undefined |
| recipient | uint256 | undefined |
| tokenAmount | uint128 | undefined |
| tonAmount | uint128 | undefined |
| swapType | uint8 | undefined |
| slippageNumerator | uint128 | undefined |
| slippageDenominator | uint128 | undefined |
| level3 | bytes | undefined |

### emergencyShutdown

```solidity
function emergencyShutdown() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### expectedReturn

```solidity
function expectedReturn(address strategyId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### forceWithdraw

```solidity
function forceWithdraw(IVault.PendingWithdrawalId pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pendingWithdrawalId | IVault.PendingWithdrawalId | undefined |

### forceWithdraw

```solidity
function forceWithdraw(IVault.PendingWithdrawalId[] pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pendingWithdrawalId | IVault.PendingWithdrawalId[] | undefined |

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
function initialize(address _token, address _bridge, address _governance, uint256 _targetDecimals, IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined |
| _bridge | address | undefined |
| _governance | address | undefined |
| _targetDecimals | uint256 | undefined |
| _rewards | IEverscale.EverscaleAddress | undefined |

### lastReport

```solidity
function lastReport() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### lockedProfit

```solidity
function lockedProfit() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### lockedProfitDegradation

```solidity
function lockedProfitDegradation() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### management

```solidity
function management() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### managementFee

```solidity
function managementFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### migrateStrategy

```solidity
function migrateStrategy(address oldVersion, address newVersion) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVersion | address | undefined |
| newVersion | address | undefined |

### pendingWithdrawals

```solidity
function pendingWithdrawals(address user, uint256 id) external view returns (struct IVault.PendingWithdrawalParams)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| id | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVault.PendingWithdrawalParams | undefined |

### pendingWithdrawalsPerUser

```solidity
function pendingWithdrawalsPerUser(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### pendingWithdrawalsTotal

```solidity
function pendingWithdrawalsTotal() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### performanceFee

```solidity
function performanceFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### report

```solidity
function report(uint256 gain, uint256 loss, uint256 _debtPayment) external nonpayable returns (uint256)
```

Reports the amount of assets the calling Strategy has free (usually in terms of ROI). The performance fee is determined here, off of the strategy&#39;s profits (if any), and sent to governance. The strategist&#39;s fee is also determined here (off of profits), to be handled according to the strategist on the next harvest. This may only be called by a Strategy managed by this Vault.

*For approved strategies, this is the most efficient behavior. The Strategy reports back what it has free, then Vault &quot;decides&quot; whether to take some back or give it more. Note that the most it can take is `gain + _debtPayment`, and the most it can give is all of the remaining reserves. Anything outside of those bounds is abnormal behavior. All approved strategies must have increased diligence around calling this function, as abnormal behavior could become catastrophic.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| gain | uint256 | Amount Strategy has realized as a gain on it&#39;s investment since its last report, and is free to be given back to Vault as earnings |
| loss | uint256 | Amount Strategy has realized as a loss on it&#39;s investment since its last report, and should be accounted for on the Vault&#39;s balance sheet. The loss will reduce the debtRatio. The next time the strategy will harvest, it will pay back the debt in an attempt to adjust to the new debt limit. |
| _debtPayment | uint256 | Amount Strategy has made available to cover outstanding debt |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Amount of debt outstanding (if totalDebt &gt; debtLimit or emergency shutdown). |

### revokeStrategy

```solidity
function revokeStrategy() external nonpayable
```






### revokeStrategy

```solidity
function revokeStrategy(address strategyId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

### rewards

```solidity
function rewards() external view returns (struct IEverscale.EverscaleAddress)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IEverscale.EverscaleAddress | undefined |

### saveWithdraw

```solidity
function saveWithdraw(bytes payload, bytes[] signatures, uint256 bounty) external nonpayable
```

Save withdrawal receipt, same as `saveWithdraw(bytes payload, bytes[] signatures)`, but allows to immediately set up bounty.



#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Withdrawal receipt. Bytes encoded `struct EverscaleEvent`. |
| signatures | bytes[] | List of relay&#39;s signatures. See not on `Bridge.verifySignedEverscaleEvent`. |
| bounty | uint256 | New value for pending withdrawal bounty. |

### saveWithdraw

```solidity
function saveWithdraw(bytes payload, bytes[] signatures) external nonpayable returns (bool instantWithdrawal, struct IVault.PendingWithdrawalId pendingWithdrawalId)
```

Save withdrawal receipt. If Vault has enough tokens and withdrawal passes the limits, then it&#39;s executed immediately. Otherwise it&#39;s saved as a pending withdrawal.



#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Withdrawal receipt. Bytes encoded `struct EverscaleEvent`. |
| signatures | bytes[] | List of relay&#39;s signatures. See not on `Bridge.verifySignedEverscaleEvent`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| instantWithdrawal | bool | Boolean, was withdrawal instantly filled or saved as a pending withdrawal. |
| pendingWithdrawalId | IVault.PendingWithdrawalId | Pending withdrawal ID. `(address(0), 0)` if no pending withdrawal was created. |

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

Set deposit fee. Must be less than `MAX_BPS`. This may be called only by `governance` or `management`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositFee | uint256 | Deposit fee, must be less than `MAX_BPS / 2`. |

### setDepositLimit

```solidity
function setDepositLimit(uint256 limit) external nonpayable
```

Changes the maximum amount of `token` that can be deposited in this Vault Note, this is not how much may be deposited by a single depositor, but the maximum amount that may be deposited across all depositors. This may be called only by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| limit | uint256 | The new deposit limit to use. |

### setEmergencyShutdown

```solidity
function setEmergencyShutdown(bool active) external nonpayable
```

Activates or deactivates Vault emergency mode, where all Strategies go into full withdrawal.     During emergency shutdown:     - Deposits are disabled     - Withdrawals are disabled (all types of withdrawals)     - Each Strategy must pay back their debt as quickly as reasonable to minimally affect their position     - Only `governance` may undo Emergency Shutdown This may only be called by `governance` or `guardian`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| active | bool | If `true`, the Vault goes into Emergency Shutdown. If `false`, the Vault goes back into     Normal Operation. |

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

Changes the address of `guardian`. This may only be called by `governance` or `guardian`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _guardian | address | The new guardian address to use. |

### setLockedProfitDegradation

```solidity
function setLockedProfitDegradation(uint256 degradation) external nonpayable
```

Changes the locked profit degradation



#### Parameters

| Name | Type | Description |
|---|---|---|
| degradation | uint256 | The rate of degradation in percent per second scaled to 1e18 |

### setManagement

```solidity
function setManagement(address _management) external nonpayable
```

Changes the management address. This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _management | address | The address to use for management. |

### setManagementFee

```solidity
function setManagementFee(uint256 fee) external nonpayable
```

Changes the value of `managementFee`. This may only be called by `governance`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | The new management fee to use. |

### setPendingWithdrawalApprove

```solidity
function setPendingWithdrawalApprove(IVault.PendingWithdrawalId[] pendingWithdrawalId, enum IVault.ApproveStatus[] approveStatus) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pendingWithdrawalId | IVault.PendingWithdrawalId[] | undefined |
| approveStatus | enum IVault.ApproveStatus[] | undefined |

### setPendingWithdrawalApprove

```solidity
function setPendingWithdrawalApprove(IVault.PendingWithdrawalId pendingWithdrawalId, enum IVault.ApproveStatus approveStatus) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pendingWithdrawalId | IVault.PendingWithdrawalId | undefined |
| approveStatus | enum IVault.ApproveStatus | undefined |

### setPendingWithdrawalBounty

```solidity
function setPendingWithdrawalBounty(uint256 id, uint256 bounty) external nonpayable
```

Changes pending withdrawal bounty for specific pending withdrawal



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | Pending withdrawal ID. |
| bounty | uint256 | The new value for pending withdrawal bounty. |

### setPerformanceFee

```solidity
function setPerformanceFee(uint256 fee) external nonpayable
```

Changes the value of `performanceFee`. Should set this value below the maximum strategist performance fee. This may only be called by `governance`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | The new performance fee to use. |

### setRewards

```solidity
function setRewards(IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _rewards | IEverscale.EverscaleAddress | undefined |

### setStrategyRewards

```solidity
function setStrategyRewards(address strategyId, IEverscale.EverscaleAddress _rewards) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| _rewards | IEverscale.EverscaleAddress | undefined |

### setUndeclaredWithdrawLimit

```solidity
function setUndeclaredWithdrawLimit(uint256 _undeclaredWithdrawLimit) external nonpayable
```

Changes the value of `undeclaredWithdrawLimit` This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _undeclaredWithdrawLimit | uint256 | The new undeclared withdraw limit to use. |

### setWithdrawFee

```solidity
function setWithdrawFee(uint256 _withdrawFee) external nonpayable
```

Set withdraw fee. Must be less than `MAX_BPS`. This may be called only by `governance` or `management`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawFee | uint256 | Withdraw fee, must be less than `MAX_BPS / 2`. |

### setWithdrawGuardian

```solidity
function setWithdrawGuardian(address _withdrawGuardian) external nonpayable
```

Changes the address of `withdrawGuardian`. This may only be called by `governance` or `withdrawGuardian`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawGuardian | address | The new withdraw guardian address to use. |

### setWithdrawLimitPerPeriod

```solidity
function setWithdrawLimitPerPeriod(uint256 _withdrawLimitPerPeriod) external nonpayable
```

Changes the value of `withdrawLimitPerPeriod` This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawLimitPerPeriod | uint256 | The new withdraw limit per period to use. |

### setWithdrawalQueue

```solidity
function setWithdrawalQueue(address[20] queue) external nonpayable
```

Changes `withdrawalQueue` This may only be called by `governance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| queue | address[20] | undefined |

### skim

```solidity
function skim(address strategyId) external nonpayable
```

Skim strategy gain to the `rewards_` address. This may only be called by `governance` or `management`



#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | Strategy address to skim. |

### strategies

```solidity
function strategies(address strategyId) external view returns (struct IVault.StrategyParams)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVault.StrategyParams | undefined |

### sweep

```solidity
function sweep(address _token) external nonpayable
```

Removes tokens from this Vault that are not the type of token managed by this Vault. This may be used in case of accidentally sending the wrong kind of token to this Vault. Tokens will be sent to `governance`. This will fail if an attempt is made to sweep the tokens that this Vault manages. This may only be called by `governance`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | The token to transfer out of this vault. |

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

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

Returns the total quantity of all assets under control of this Vault, whether they&#39;re loaned out to a Strategy, or currently held in the Vault.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The total assets under control of this Vault. |

### totalDebt

```solidity
function totalDebt() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### undeclaredWithdrawLimit

```solidity
function undeclaredWithdrawLimit() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### updateStrategyDebtRatio

```solidity
function updateStrategyDebtRatio(address strategyId, uint256 _debtRatio) external nonpayable
```

Change the quantity of assets `strategy` may manage. This may be called by `governance` or `management`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | The Strategy to update. |
| _debtRatio | uint256 | The quantity of assets `strategy` may now manage. |

### updateStrategyMaxDebtPerHarvest

```solidity
function updateStrategyMaxDebtPerHarvest(address strategyId, uint256 maxDebtPerHarvest) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| maxDebtPerHarvest | uint256 | undefined |

### updateStrategyMinDebtPerHarvest

```solidity
function updateStrategyMinDebtPerHarvest(address strategyId, uint256 minDebtPerHarvest) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| minDebtPerHarvest | uint256 | undefined |

### updateStrategyPerformanceFee

```solidity
function updateStrategyPerformanceFee(address strategyId, uint256 _performanceFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| _performanceFee | uint256 | undefined |

### withdraw

```solidity
function withdraw(uint256 id, uint256 amountRequested, address recipient, uint256 maxLoss, uint256 bounty) external nonpayable returns (uint256 amountAdjusted)
```

Withdraws the calling account&#39;s pending withdrawal from this Vault.



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | Pending withdrawal ID. |
| amountRequested | uint256 | Amount of tokens to be withdrawn. |
| recipient | address | The address to send the redeemed tokens. |
| maxLoss | uint256 | The maximum acceptable loss to sustain on withdrawal. If a loss is specified, up to that amount of tokens may be burnt to cover losses on withdrawal. |
| bounty | uint256 | New value for bounty. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountAdjusted | uint256 | The quantity of tokens redeemed. |

### withdrawFee

```solidity
function withdrawFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### withdrawGuardian

```solidity
function withdrawGuardian() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### withdrawLimitPerPeriod

```solidity
function withdrawLimitPerPeriod() external view returns (uint256)
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

### withdrawalPeriods

```solidity
function withdrawalPeriods(uint256 withdrawalPeriodId) external view returns (struct IVault.WithdrawalPeriodParams)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| withdrawalPeriodId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVault.WithdrawalPeriodParams | undefined |

### withdrawalQueue

```solidity
function withdrawalQueue() external view returns (address[20])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[20] | undefined |



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

### FactoryDeposit

```solidity
event FactoryDeposit(uint128 amount, int8 wid, uint256 user, uint256 creditor, uint256 recipient, uint128 tokenAmount, uint128 tonAmount, uint8 swapType, uint128 slippageNumerator, uint128 slippageDenominator, bytes1 separator, bytes level3)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount  | uint128 | undefined |
| wid  | int8 | undefined |
| user  | uint256 | undefined |
| creditor  | uint256 | undefined |
| recipient  | uint256 | undefined |
| tokenAmount  | uint128 | undefined |
| tonAmount  | uint128 | undefined |
| swapType  | uint8 | undefined |
| slippageNumerator  | uint128 | undefined |
| slippageDenominator  | uint128 | undefined |
| separator  | bytes1 | undefined |
| level3  | bytes | undefined |

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

### PendingWithdrawalCancel

```solidity
event PendingWithdrawalCancel(address recipient, uint256 id, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |
| amount  | uint256 | undefined |

### PendingWithdrawalCreated

```solidity
event PendingWithdrawalCreated(address recipient, uint256 id, uint256 amount, bytes32 payloadId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |
| amount  | uint256 | undefined |
| payloadId  | bytes32 | undefined |

### PendingWithdrawalForce

```solidity
event PendingWithdrawalForce(address recipient, uint256 id)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |

### PendingWithdrawalUpdateApproveStatus

```solidity
event PendingWithdrawalUpdateApproveStatus(address recipient, uint256 id, enum IVault.ApproveStatus approveStatus)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |
| approveStatus  | enum IVault.ApproveStatus | undefined |

### PendingWithdrawalUpdateBounty

```solidity
event PendingWithdrawalUpdateBounty(address recipient, uint256 id, uint256 bounty)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |
| bounty  | uint256 | undefined |

### PendingWithdrawalWithdraw

```solidity
event PendingWithdrawalWithdraw(address recipient, uint256 id, uint256 requestedAmount, uint256 redeemedAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| id  | uint256 | undefined |
| requestedAmount  | uint256 | undefined |
| redeemedAmount  | uint256 | undefined |

### StrategyAdded

```solidity
event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| debtRatio  | uint256 | undefined |
| minDebtPerHarvest  | uint256 | undefined |
| maxDebtPerHarvest  | uint256 | undefined |
| performanceFee  | uint256 | undefined |

### StrategyAddedToQueue

```solidity
event StrategyAddedToQueue(address indexed strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |

### StrategyMigrated

```solidity
event StrategyMigrated(address indexed oldVersion, address indexed newVersion)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVersion `indexed` | address | undefined |
| newVersion `indexed` | address | undefined |

### StrategyRemovedFromQueue

```solidity
event StrategyRemovedFromQueue(address indexed strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |

### StrategyReported

```solidity
event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalSkim, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| gain  | uint256 | undefined |
| loss  | uint256 | undefined |
| debtPaid  | uint256 | undefined |
| totalGain  | uint256 | undefined |
| totalSkim  | uint256 | undefined |
| totalLoss  | uint256 | undefined |
| totalDebt  | uint256 | undefined |
| debtAdded  | uint256 | undefined |
| debtRatio  | uint256 | undefined |

### StrategyRevoked

```solidity
event StrategyRevoked(address indexed strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |

### StrategyUpdateDebtRatio

```solidity
event StrategyUpdateDebtRatio(address indexed strategy, uint256 debtRatio)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| debtRatio  | uint256 | undefined |

### StrategyUpdateMaxDebtPerHarvest

```solidity
event StrategyUpdateMaxDebtPerHarvest(address indexed strategy, uint256 maxDebtPerHarvest)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| maxDebtPerHarvest  | uint256 | undefined |

### StrategyUpdateMinDebtPerHarvest

```solidity
event StrategyUpdateMinDebtPerHarvest(address indexed strategy, uint256 minDebtPerHarvest)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| minDebtPerHarvest  | uint256 | undefined |

### StrategyUpdatePerformanceFee

```solidity
event StrategyUpdatePerformanceFee(address indexed strategy, uint256 performanceFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy `indexed` | address | undefined |
| performanceFee  | uint256 | undefined |

### StrategyUpdateRewards

```solidity
event StrategyUpdateRewards(address strategyId, int128 wid, uint256 addr)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId  | address | undefined |
| wid  | int128 | undefined |
| addr  | uint256 | undefined |

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

### UpdateDepositLimit

```solidity
event UpdateDepositLimit(uint256 depositLimit)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| depositLimit  | uint256 | undefined |

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

### UpdateManagementFee

```solidity
event UpdateManagementFee(uint256 managenentFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| managenentFee  | uint256 | undefined |

### UpdatePerformanceFee

```solidity
event UpdatePerformanceFee(uint256 performanceFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| performanceFee  | uint256 | undefined |

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

### UpdateUndeclaredWithdrawLimit

```solidity
event UpdateUndeclaredWithdrawLimit(uint256 undeclaredWithdrawLimit)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| undeclaredWithdrawLimit  | uint256 | undefined |

### UpdateWithdrawFee

```solidity
event UpdateWithdrawFee(uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee  | uint256 | undefined |

### UpdateWithdrawGuardian

```solidity
event UpdateWithdrawGuardian(address withdrawGuardian)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| withdrawGuardian  | address | undefined |

### UpdateWithdrawLimitPerPeriod

```solidity
event UpdateWithdrawLimitPerPeriod(uint256 withdrawLimitPerPeriod)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| withdrawLimitPerPeriod  | uint256 | undefined |

### UpdateWithdrawalQueue

```solidity
event UpdateWithdrawalQueue(address[20] queue)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| queue  | address[20] | undefined |

### UserDeposit

```solidity
event UserDeposit(address sender, int128 recipientWid, uint256 recipientAddr, uint256 amount, address withdrawalRecipient, uint256 withdrawalId, uint256 bounty)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender  | address | undefined |
| recipientWid  | int128 | undefined |
| recipientAddr  | uint256 | undefined |
| amount  | uint256 | undefined |
| withdrawalRecipient  | address | undefined |
| withdrawalId  | uint256 | undefined |
| bounty  | uint256 | undefined |



