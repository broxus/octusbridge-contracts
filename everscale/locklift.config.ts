import {LockliftConfig} from "locklift";
import { FactorySource } from "./build/factorySource";
import { SimpleGiver, GiverWallet, TestnetGiver } from "./giverSettings";
const LOCAL_NETWORK_ENDPOINT = "http://localhost/graphql";

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  compiler: {
    // Specify path to your TON-Solidity-Compiler
    path: "/usr/local/bin/solc-e66e9ac",

    // Or specify version of compiler

    // Specify config for extarnal contracts as in exapmple
    // This filed for generating types only
    externalContracts: {
      "../node_modules/ton-eth-bridge-token-contracts/build": ['TokenRoot', 'TokenWallet']
    }
  },
  linker: {
    // Specify path to your stdlib
    lib: "/Users/pavlovdog/TON-Solidity-Compiler/lib/stdlib_sol.tvm",
    // // Specify path to your Linker
    path: "/usr/local/bin/tvm_linker-0.16.1",
  },
  networks: {
    local: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: {
        group: "localnet",
        type: "graphql",
        data: {
          endpoints: [LOCAL_NETWORK_ENDPOINT],
          local: true,
        },
      },
      // This giver is the default local-node giverV2
      giver: {
        // Check if you need to provide a custom giver
        giverFactory: (ever, keyPair, address) => new SimpleGiver(ever, keyPair, address),
        address: "0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415",
        key: "172af540e43a524763dd53b26a066d472a97c4de37d5498170564510608250c3",
      },
      tracing: {
        endpoint: LOCAL_NETWORK_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        // phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        amount: 20,
      },
    },
    mainnet: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: "mainnetJrpc",
      // Here, default SafeMultisig wallet is used as a giver
      giver: {
        giverFactory: (ever, keyPair, address) => new GiverWallet(ever, keyPair, address),
        address: "0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415",
        // you can use bip39 phrase instead of key
        phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        accountId: 0,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        // phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        amount: 20,
      },
    },
  },
  // you can use any settings that mocha framework support
  mocha: {
    timeout: 2000000,
  },
};

export default config;
