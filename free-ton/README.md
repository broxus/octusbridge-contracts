# FreeTON contracts specification

At this document, specification on the FreeTON bridge contracts is given.

## Bridge contract

Basic contract of the bridge. Stores basic logic and list of authenticated relays.
Most of the relay interactions, should be done through this contract, by calling proxying functions.

### Add Ethereum event configuration

```
function addEthereumEventConfiguration(
        bytes ethereumEventABI,
        bytes ethereumAddress,
        address eventProxyAddress
    )
```

### Subscribe to new Ethereum event configurations

While adding new Ethereum event configuration `event AddEthereumEventConfigurationEvent(address indexed ethereumEventConfigurationAddress)` is emitted. Subscribe to it, to receive new Ethereum event configurations.

### Confirm Ethereum event configuration

```
function confirmEthereumEventConfiguration(
        address ethereumEventConfigurationAddress
    )
```

### Confirm Ethereum event

To confirm an Ethereum event, it's configuration should be activated.

```
function confirmEthereumEvent(
        bytes eventTransaction,
        uint eventIndex,
        TvmCell eventData,
        address ethereumEventConfigurationAddress
    )
```

## Ethereum event configuration contract

### Get Ethereum event configuration details

```
function getDetails() public view returns(
        bytes _eventABI,
        bytes _eventAddress,
        address _proxyAddress,
        uint _requiredConfirmations,
        uint _requiredRejects,
        uint[] _confirmKeys,
        uint[] _rejectKeys,
        bool _active
    )
```

## Ethereum event contract

### Get Ethereum event details

```
function getDetails() public view returns (
        bytes _eventTransaction,
        uint _eventIndex,
        TvmCell _eventData,
        address _proxyAddress,
        address _ethereumEventConfirguration,
        bool _proxyCallbackExecuted,
        uint[] _confirmKeys,
        uint[] _rejectKeys
    )
```
