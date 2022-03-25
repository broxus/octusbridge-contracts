# IVault









## Methods

### acceptGovernance

```solidity
function acceptGovernance() external nonpayable
```






### addStrategy

```solidity
function addStrategy(address strategyId, uint256 _debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 _performanceFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| _debtRatio | uint256 | undefined |
| minDebtPerHarvest | uint256 | undefined |
| maxDebtPerHarvest | uint256 | undefined |
| _performanceFee | uint256 | undefined |

### apiVersion

```solidity
function apiVersion() external view returns (string api_version)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| api_version | string | undefined |

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
function deposit(IEverscale.EverscaleAddress recipient, uint256[] amount, IVault.PendingWithdrawalId[] pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256[] | undefined |
| pendingWithdrawalId | IVault.PendingWithdrawalId[] | undefined |

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
function deposit(IEverscale.EverscaleAddress recipient, uint256 amount, IVault.PendingWithdrawalId pendingWithdrawalId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | IEverscale.EverscaleAddress | undefined |
| amount | uint256 | undefined |
| pendingWithdrawalId | IVault.PendingWithdrawalId | undefined |

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
function pendingWithdrawalsPerUser(address user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

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
function report(uint256 profit, uint256 loss, uint256 _debtPayment) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| profit | uint256 | undefined |
| loss | uint256 | undefined |
| _debtPayment | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |
| bounty | uint256 | undefined |

### saveWithdraw

```solidity
function saveWithdraw(bytes payload, bytes[] signatures) external nonpayable returns (bool instantWithdrawal, struct IVault.PendingWithdrawalId pendingWithdrawalId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |
| signatures | bytes[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| instantWithdrawal | bool | undefined |
| pendingWithdrawalId | IVault.PendingWithdrawalId | undefined |

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

### setDepositLimit

```solidity
function setDepositLimit(uint256 limit) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| limit | uint256 | undefined |

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

### setLockedProfitDegradation

```solidity
function setLockedProfitDegradation(uint256 degradation) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| degradation | uint256 | undefined |

### setManagement

```solidity
function setManagement(address _management) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _management | address | undefined |

### setManagementFee

```solidity
function setManagementFee(uint256 fee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | undefined |

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |
| bounty | uint256 | undefined |

### setPerformanceFee

```solidity
function setPerformanceFee(uint256 fee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fee | uint256 | undefined |

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| _undeclaredWithdrawLimit | uint256 | undefined |

### setWithdrawFee

```solidity
function setWithdrawFee(uint256 _withdrawFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawFee | uint256 | undefined |

### setWithdrawGuardian

```solidity
function setWithdrawGuardian(address _withdrawGuardian) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawGuardian | address | undefined |

### setWithdrawLimitPerPeriod

```solidity
function setWithdrawLimitPerPeriod(uint256 _withdrawLimitPerPeriod) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawLimitPerPeriod | uint256 | undefined |

### setWithdrawalQueue

```solidity
function setWithdrawalQueue(address[20] queue) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| queue | address[20] | undefined |

### skim

```solidity
function skim(address strategyId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |

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

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategyId | address | undefined |
| _debtRatio | uint256 | undefined |

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
function withdraw(uint256 id, uint256 amountRequested, address recipient, uint256 maxLoss, uint256 bounty) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |
| amountRequested | uint256 | undefined |
| recipient | address | undefined |
| maxLoss | uint256 | undefined |
| bounty | uint256 | undefined |

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

### PendingWithdrawalFill

```solidity
event PendingWithdrawalFill(address recipient, uint256 id)
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



