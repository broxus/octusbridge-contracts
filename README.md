# Broxus Ethereum <-> FreeTON bridge smart contracts

Set of smart contracts, docs, tests and additional tools for the Bridge between the Ethereum and Free TON networks.

## Configuration

Set up both Ethereum abd FreeTON configuration in `env/` directory. Use `template` files as a basic example and fill the empty fields. 

### Ethereum

- `BRIDGE_INITIAL_` settings used for initial bridge setup.
- Leave the `ENV_NETWORK_` settings if you're not planning to use Goerli or Mainnet network.

### Free TON

FreeTON env configuration will probably change, keep your eyes on.

- Use `NETWORK` http://ton_node in case you're using Docker compose
- Use `SEED` to generate keys. Seed can be generated with `tonos-cli genphrase`
- Leave `RANDOM_TRUFFLE_NONCE` blank if you need to determine contract address. Means, that test can be run only once. Set it `1` to deploy new addresses each time.

## Docker run

After configuration is specified, run docker-compose in a single command

```
docker-compose up -d
```

## Local run

This section explains how to run and test contracts locally.

### Node version

Following versions were used for development

```
npm --version
6.14.8
node --version
v10.22.1
```

### Installation

Install all the dependencies both for FreeTON and Ethereum parts.

```
npm install
```

### Ethereum 

#### Run the local Ethereum node

By default, the RPC will be available on the http://127.0.0.1:8545

```
ganache-cli
```

### Deploy the smart contracts

```
cd ethereum/
truffle migrate
```

### FreeTON

#### Run the local TON node

Use the [TON local-node](https://hub.docker.com/r/tonlabs/local-node) for local environment.

```
docker run --rm -d --name local-node -p80:80 tonlabs/local-node
```

#### Prepare the smart contracts

By default, there're all the necessary artifacts at the `free-ton/build/` directory. To rebuild the contracts, use the one liner:

```
npm run compile-ton
```

#### Run the migrations

```
npm run migrate-ton
```

#### Run the tests

```
npm run test-ton
```

## Testing with docker

First of all, create `freeton.env` and `ethereum.env` files.

1. If you want to test on local node, run:

```
./scripts/up.sh
```

This command will setup local ganache node accessible on http://127.0.0.1:8545 and run truffle migrations for Ethereum
 and setup local TON node on http://127.0.0.1:80 + run mocha tests

2. If you want to deploy to custom networks (specified in .env files), run:

```
./scripts/up_custom.sh
```

This command doesn't setup local nodes, only run migrations on specified custom networks.

To check logs of running containers, run:

```
./scripts/logs.sh N
```

This will output last `N` rows of logs.

To stop running containers, run:

```
./scripts/down.sh
```
