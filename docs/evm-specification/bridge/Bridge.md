# Bridge

*https://github.com/broxus*

> EVM Bridge contract

Stores relays for each round, implements relay slashing, helps in validating Everscale-EVM events



## Methods

### banRelays

```solidity
function banRelays(address[] _relays) external nonpayable
```

Ban relays



#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | address[] | List of relay addresses to ban |

### blacklist

```solidity
function blacklist(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### cache

```solidity
function cache(bytes32) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### decodeEverscaleEvent

```solidity
function decodeEverscaleEvent(bytes payload) external pure returns (struct IEverscale.EverscaleEvent _event)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _event | IEverscale.EverscaleEvent | undefined |

### decodeRoundRelaysEventData

```solidity
function decodeRoundRelaysEventData(bytes payload) external pure returns (uint32 round, uint160[] _relays, uint32 roundEnd)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| round | uint32 | undefined |
| _relays | uint160[] | undefined |
| roundEnd | uint32 | undefined |

### emergencyShutdown

```solidity
function emergencyShutdown() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### forceRoundRelays

```solidity
function forceRoundRelays(uint160[] _relays, uint32 roundEnd) external nonpayable
```

Forced set of next round relays

*Can be called only by `roundSubmitter`*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | uint160[] | Next round relays |
| roundEnd | uint32 | Round end |

### initialRound

```solidity
function initialRound() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### initialize

```solidity
function initialize(address _owner, address _roundSubmitter, uint32 _minimumRequiredSignatures, uint32 _roundTTL, uint32 _initialRound, uint32 _initialRoundEnd, uint160[] _relays) external nonpayable
```

Bridge initializer

*`roundRelaysConfiguration` should be specified after deploy, since it&#39;s an Everscale contract, which needs EVM Bridge address to be deployed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner | address | Bridge owner |
| _roundSubmitter | address | Round submitter |
| _minimumRequiredSignatures | uint32 | Minimum required signatures per round. |
| _roundTTL | uint32 | Round TTL after round end. |
| _initialRound | uint32 | Initial round number. Useful in case new EVM network is connected to the bridge. |
| _initialRoundEnd | uint32 | Initial round end timestamp. |
| _relays | uint160[] | Initial (genesis) set of relays. Encode addresses as uint160. |

### isBanned

```solidity
function isBanned(address candidate) external view returns (bool)
```

Check if relay is banned. Ban is global. If the relay is banned it means it lost relay power in all rounds, past and future.



#### Parameters

| Name | Type | Description |
|---|---|---|
| candidate | address | Address to check |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isRelay

```solidity
function isRelay(uint32 round, address candidate) external view returns (bool)
```

Check if some address is relay at specific round

*Even if relay was banned, this method still returns `true`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| round | uint32 | Round id |
| candidate | address | Address to check |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isRoundRotten

```solidity
function isRoundRotten(uint32 round) external view returns (bool)
```



*Check if round is rotten*

#### Parameters

| Name | Type | Description |
|---|---|---|
| round | uint32 | Round id |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### lastRound

```solidity
function lastRound() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### minimumRequiredSignatures

```solidity
function minimumRequiredSignatures() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### pause

```solidity
function pause() external nonpayable
```

Pause Bridge contract. Can be called only by `owner`.

*When Bridge paused, any signature verification Everscale-EVM event fails.*


### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### recoverSignature

```solidity
function recoverSignature(bytes payload, bytes signature) external pure returns (address signer)
```

Recover signer from the payload and signature



#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Payload |
| signature | bytes | Signature |

#### Returns

| Name | Type | Description |
|---|---|---|
| signer | address | undefined |

### relays

```solidity
function relays(uint32, address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### roundRelaysConfiguration

```solidity
function roundRelaysConfiguration() external view returns (int8 wid, uint256 addr)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| wid | int8 | undefined |
| addr | uint256 | undefined |

### roundSubmitter

```solidity
function roundSubmitter() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### roundTTL

```solidity
function roundTTL() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### rounds

```solidity
function rounds(uint32) external view returns (uint32 end, uint32 ttl, uint32 relays, uint32 requiredSignatures)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| end | uint32 | undefined |
| ttl | uint32 | undefined |
| relays | uint32 | undefined |
| requiredSignatures | uint32 | undefined |

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

Grant relay permission for set of addresses at specific round



#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Bytes encoded EverscaleEvent structure |
| signatures | bytes[] | Payload signatures |

### setRoundSubmitter

```solidity
function setRoundSubmitter(address _roundSubmitter) external nonpayable
```

Set round submitter

*Can be called only by owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundSubmitter | address | New round submitter address |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### unbanRelays

```solidity
function unbanRelays(address[] _relays) external nonpayable
```

Unban relays



#### Parameters

| Name | Type | Description |
|---|---|---|
| _relays | address[] | List of relay addresses to unban |

### unpause

```solidity
function unpause() external nonpayable
```

Unpause Bridge contract.




### updateMinimumRequiredSignatures

```solidity
function updateMinimumRequiredSignatures(uint32 _minimumRequiredSignatures) external nonpayable
```

Update minimum amount of required signatures per round This parameter limits the minimum amount of signatures to be required for Everscale-EVM event.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _minimumRequiredSignatures | uint32 | New value |

### updateRoundTTL

```solidity
function updateRoundTTL(uint32 _roundTTL) external nonpayable
```

Update round TTL

*This affects only future rounds. Rounds, that were already set, keep their current TTL.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _roundTTL | uint32 | New TTL value |

### verifySignedEverscaleEvent

```solidity
function verifySignedEverscaleEvent(bytes payload, bytes[] signatures) external view returns (uint32 errorCode)
```

Verify `EverscaleEvent` signatures.

*Signatures should be sorted by the ascending signers. Error codes: 0. Verification passed (no error) 1. Specified round is less than initial round 2. Specified round is greater than last round 3. Not enough correct signatures. Possible reasons: - Some of the signers are not relays at the specified round - Some of the signers are banned 4. Round is rotten. 5. Verification passed, but bridge is in &quot;paused&quot; mode*

#### Parameters

| Name | Type | Description |
|---|---|---|
| payload | bytes | Bytes encoded `EverscaleEvent` structure |
| signatures | bytes[] | Payload signatures |

#### Returns

| Name | Type | Description |
|---|---|---|
| errorCode | uint32 | Error code |



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

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### RoundRelay

```solidity
event RoundRelay(uint32 indexed round, address indexed relay)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| round `indexed` | uint32 | undefined |
| relay `indexed` | address | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

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



