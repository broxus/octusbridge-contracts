# Broxus Ethereum <-> FreeTON bridge smart contracts

Set of smart contracts, docs, tests and additional tools for the Bridge between the Ethereum and Free TON networks.

## Configuration

Clone `settings.template.env` into the `settings.env` and fill the data. Specify seeds for Ethereum and TON.


## Docker run

After configuration is specified, run docker-compose in a single command

```
set -a; source settings.env; set +a; docker-compose up -d
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
set -a; source settings.env; set +a; npm run compile-ton
```

#### Run the migrations

```
set -a; source settings.env; set +a; npm run migrate-ton
```

#### Run the tests

```
set -a; source settings.env; set +a; npm run test-ton
```
