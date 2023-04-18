import {LockliftConfig} from "locklift";
import { FactorySource } from "./build/factorySource";
const LOCAL_NETWORK_ENDPOINT = "http://localhost/graphql";

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  compiler: {
    version: "0.62.0",
    // Specify config for extarnal contracts as in exapmple
    // This filed for generating types only
    externalContracts: {
      "../node_modules/ton-eth-bridge-token-contracts/build": ['TokenRoot', 'TokenWallet']
    }
  },
  linker: {
    version: "0.15.48",
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
    main: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: "mainnetJrpc",
      // Here, default SafeMultisig wallet is used as a giver
      giver: {
        address: "0:3bcef54ea5fe3e68ac31b17799cdea8b7cffd4da75b0b1a70b93a18b5c87f723",
        key: process.env.MAIN_GIVER_KEY ?? "",
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        // phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        amount: 20,
      },
    },
    venom_testnet: {
      connection: {
        id: 1000,
        group: "group",
        type: "jrpc",
        data: {
          endpoint: "https://jrpc-testnet.venom.foundation"
        },
      },
      giver: {
        address: process.env.VENOM_GIVER_ADDRESS ?? "",
        phrase: process.env.VENOM_GIVER_PHRASE ?? "",
        accountId: 0,
      },
      keys: {
        amount: 20
      }
    }
  },
  // you can use any settings that mocha framework support
  mocha: {
    timeout: 2000000,
  },
};

export default config;
