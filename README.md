# Ethereum FreeTON bridge smart contracts

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

Create an environment file from the template

```
cd env
cp env/ethereum.template.env env/ethereum.env
```

Fill the settings in the `ethereum.env`. Leave the `ETHEREUM_` settings empty if you're not going to perform custom deploy (e.g. )

## Local deploy

### Run the local Ethereum node

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
