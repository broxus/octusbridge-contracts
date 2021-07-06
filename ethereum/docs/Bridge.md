# `Bridge`

Stores relays for each round, implements slashing

## Functions:
- [`initialize(address admin, struct IBridge.BridgeConfiguration _configuration, address[] relays)`](#Bridge-initialize-address-struct-IBridge-BridgeConfiguration-address---)
- [`isRelay(uint32 round, address candidate)`](#Bridge-isRelay-uint32-address-)
- [`verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures)`](#Bridge-verifyRelaySignatures-uint32-bytes-bytes---)
- [`recoverSignature(bytes payload, bytes signature)`](#Bridge-recoverSignature-bytes-bytes-)
- [`setRoundRelays(bytes payload, bytes[] signatures)`](#Bridge-setRoundRelays-bytes-bytes---)
- [`setConfiguration(struct IBridge.BridgeConfiguration _configuration)`](#Bridge-setConfiguration-struct-IBridge-BridgeConfiguration-)


### Function `initialize(address admin, struct IBridge.BridgeConfiguration _configuration, address[] relays)` [link](#Bridge-initialize-address-struct-IBridge-BridgeConfiguration-address---)
Initializer

#### Parameters:
- `admin`: Bridge admin

- `_configuration`: Initial bridge configuration

- `relays`: Initial set of relays (round 0)
### Function `isRelay(uint32 round, address candidate) → bool` [link](#Bridge-isRelay-uint32-address-)
No description
### Function `verifyRelaySignatures(uint32 round, bytes payload, bytes[] signatures) → bool` [link](#Bridge-verifyRelaySignatures-uint32-bytes-bytes---)
No description
### Function `recoverSignature(bytes payload, bytes signature) → address signer` [link](#Bridge-recoverSignature-bytes-bytes-)
No description
### Function `setRoundRelays(bytes payload, bytes[] signatures)` [link](#Bridge-setRoundRelays-bytes-bytes---)
No description
### Function `setConfiguration(struct IBridge.BridgeConfiguration _configuration)` [link](#Bridge-setConfiguration-struct-IBridge-BridgeConfiguration-)
No description

