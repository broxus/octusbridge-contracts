# `Bridge`

Stores relays for each round, implements slashing

## Functions:
- [`initialize(address admin, struct IBridge.BridgeConfiguration _configuration, address[] relays)`](#Bridge-initialize-address-struct-IBridge-BridgeConfiguration-address---)
- [`isRelay(uint32 round, address candidate)`](#Bridge-isRelay-uint32-address-)
- [`verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures)`](#Bridge-verifyRelaySignatures-uint32-bytes-bytes---)
- [`recoverSignature(bytes payload, bytes signature)`](#Bridge-recoverSignature-bytes-bytes-)
- [`setRoundRelays(bytes payload, bytes[] signatures)`](#Bridge-setRoundRelays-bytes-bytes---)
- [`setConfiguration(struct IBridge.BridgeConfiguration _configuration)`](#Bridge-setConfiguration-struct-IBridge-BridgeConfiguration-)


### Function `initialize(address admin, struct IBridge.BridgeConfiguration _configuration, address[] relays)` {#Bridge-initialize-address-struct-IBridge-BridgeConfiguration-address---}
Initializer

#### Parameters:
- `admin`: Bridge admin

- `_configuration`: Initial bridge configuration

- `relays`: Initial set of relays (round 0)
### Function `isRelay(uint32 round, address candidate) → bool` {#Bridge-isRelay-uint32-address-}
No description
### Function `verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures) → bool` {#Bridge-verifyRelaySignatures-uint32-bytes-bytes---}
Required amount of signatures is (2/3 * relays at round) + 1
Signatures should be sorted by the ascending signers, so it's cheaper to detect duplicates

#### Parameters:
- `round`: Round id

- `payload`: Bytes encoded payload

- `signatures`: Payload signatures

#### Return Values:
- All checks are passed or not
### Function `recoverSignature(bytes payload, bytes signature) → address signer` {#Bridge-recoverSignature-bytes-bytes-}
No description
#### Parameters:
- `payload`: Payload

- `signature`: Signature
### Function `setRoundRelays(bytes payload, bytes[] signatures)` {#Bridge-setRoundRelays-bytes-bytes---}
Grant relay permission for set of addresses at specific round

#### Parameters:
- `payload`: Bytes encoded TONEvent structure

- `signatures`: Payload signatures
### Function `setConfiguration(struct IBridge.BridgeConfiguration _configuration)` {#Bridge-setConfiguration-struct-IBridge-BridgeConfiguration-}
No description
#### Parameters:
- `_configuration`: New bridge configuration



# `DAO`



## Functions:
- [`initialize(address _bridge)`](#DAO-initialize-address-)
- [`updateBridge(address _bridge)`](#DAO-updateBridge-address-)
- [`execute(bytes payload, bytes[] signatures)`](#DAO-execute-bytes-bytes---)


### Function `initialize(address _bridge)` {#DAO-initialize-address-}
No description
### Function `updateBridge(address _bridge)` {#DAO-updateBridge-address-}
No description
### Function `execute(bytes payload, bytes[] signatures) → bytes[] responses` {#DAO-execute-bytes-bytes---}
No description



# `IBridge`



## Functions:
- [`isRelay(uint32 round, address candidate)`](#IBridge-isRelay-uint32-address-)
- [`verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures)`](#IBridge-verifyRelaySignatures-uint32-bytes-bytes---)
- [`setRoundRelays(bytes payload, bytes[] signatures)`](#IBridge-setRoundRelays-bytes-bytes---)
- [`setConfiguration(struct IBridge.BridgeConfiguration _configuration)`](#IBridge-setConfiguration-struct-IBridge-BridgeConfiguration-)

## Events:
- [`RoundRelay(uint32 round, address relay)`](#IBridge-RoundRelay-uint32-address-)
- [`ConfigurationUpdate(struct IBridge.BridgeConfiguration configuration)`](#IBridge-ConfigurationUpdate-struct-IBridge-BridgeConfiguration-)

### Function `isRelay(uint32 round, address candidate) → bool` {#IBridge-isRelay-uint32-address-}
No description
#### Parameters:
- `round`: Round id

- `candidate`: Address to check
### Function `verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures) → bool` {#IBridge-verifyRelaySignatures-uint32-bytes-bytes---}
No description
### Function `setRoundRelays(bytes payload, bytes[] signatures)` {#IBridge-setRoundRelays-bytes-bytes---}
No description
### Function `setConfiguration(struct IBridge.BridgeConfiguration _configuration)` {#IBridge-setConfiguration-struct-IBridge-BridgeConfiguration-}
No description

## Event `RoundRelay(uint32 round, address relay)` {#IBridge-RoundRelay-uint32-address-}
Relay permission granted

### Parameters:
- `round`: Round id

- `relay`: Relays address
## Event `ConfigurationUpdate(struct IBridge.BridgeConfiguration configuration)` {#IBridge-ConfigurationUpdate-struct-IBridge-BridgeConfiguration-}
Configuration updated

### Parameters:
- `configuration`: Bridge configuration


# `IDAO`



## Functions:
- [`updateBridge(address _bridge)`](#IDAO-updateBridge-address-)
- [`execute(bytes payload, bytes[] signatures)`](#IDAO-execute-bytes-bytes---)


### Function `updateBridge(address _bridge)` {#IDAO-updateBridge-address-}
No description
### Function `execute(bytes payload, bytes[] signatures) → bytes[] responses` {#IDAO-execute-bytes-bytes---}
No description



# `Array`



## Functions:





# `ECDSA`



## Functions:





# `UniversalERC20`



## Functions:





# `Cache`






