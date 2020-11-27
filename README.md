# Broxus Ethereum <-> FreeTON bridge smart contracts

Set of smart contracts, docs, tests and additional tools for the Bridge between the Ethereum and Free TON networks.

## Installation

Following versions were used for development

```
npm --version
6.14.8
node --version
v10.22.1
```

Install all the dependencies

```
npm install
```

## Configuration

Different configurations are used for FreeTON and Ethereum smart contracts. Choose what you need.

### Ethereum

Create an environment file from the template

```
cd env
cp ethereum.template.env ethereum.env
```

Fill the settings in the `ethereum.env`. Leave the `ETHEREUM_` settings empty if you're not going to perform custom deploy (e.g. )

### Free TON

Create an environment file from the template

```
cd env
cp freeton.template.env freeton.env
```

Fill the `PUBLIC_KEY` and `SECRET_KEY`. This keys will be used for signing every transaction during the migrations and tests.

## Local test

Both Ethereum and Free TON parts can be tested locally.

### Ethereum 

#### Run the local Ethereum node

The RPC will be available on the http://127.0.0.1:8545

```
ganache-cli
```

### Deploy the smart contracts

```
cd ethereum/
truffle migrate
```

## Custom deploy

Specify the `ETHEREUM_` settings in the `env/ethereum.env` file. Then deploy the contracts:

```
cd ethereum/
truffle migrate --network env
```

### FreeTON

#### Run the local TON node

Use the [TON local-node](https://hub.docker.com/r/tonlabs/local-node) for local environment.

```
docker run --rm -d --name local-node -p80:80 tonlabs/local-node
```

#### Prepare the smart contracts

At this step contracts are compiled 

```
cd free-ton
./scripts/build-contract.sh
```


## Testing with docker
1. If you want to test on local node, run:
```
./scripts/up.sh
```
This command will setup local ganache node accessible on http://127.0.0.1:8545 and run truffle migrations.

2. If you want to deploy to custom network, at first create `ethereum.env` file, and then run:
```
./scripts/up_custom.sh
```
This command will run `truffle migrate` with flag `--network env` . 

To check logs of running containers, run:
```
./scripts/logs.sh N
```
This will output last `N` rows of logs.

To stop running containers, run:
```
./scripts/down.sh
```