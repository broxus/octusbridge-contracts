import { LockliftConfig } from "locklift";
import { FactorySource } from "./build/factorySource";

import "locklift-verifier";

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  verifier: {
    verifierVersion: "latest",
    apiKey: process.env.VERIFIER_API_KEY!,
    secretKey: process.env.VERIFIER_SECRET_KEY!,
  },
  compiler: {
    version: "0.62.0",
    externalContracts: {
      "../node_modules/ton-eth-bridge-token-contracts/build": ['TokenRoot', 'TokenWallet']
    }
  },
  linker: {
    version: "0.15.48",
  },
  networks: {
    proxy: {
      deploy: ["local/"],
      giver: {
        address: process.env.LOCAL_GIVER_ADDRESS!,
        key: process.env.LOCAL_GIVER_KEY!,
      },
      connection: {
        id: 1001,
        // @ts-ignore
        type: "proxy",
        // @ts-ignore
        data: {},
      },
      keys: {
        amount: 20,
      },
    },
    local: {
      connection: {
        id: 1234,
        group: "localnet",
        type: "graphql",
        data: {
          endpoints: [process.env.LOCAL_NETWORK_ENDPOINT!],
          local: true,
        },
      },
      giver: {
        address: process.env.LOCAL_GIVER_ADDRESS!,
        key: process.env.LOCAL_GIVER_KEY!,
      },
      keys: {
        amount: 20,
      },
    },
    venom_main: {
      connection: {
        id: 1,
        group: "group",
        type: "jrpc",
        data: {
          endpoint: process.env.VENOM_MAIN_JRPC_ENDPOINT!
        },
      },
      giver: {
        address: process.env.VENOM_MAIN_GIVER_ADDRESS!,
        phrase: process.env.VENOM_MAIN_GIVER_PHRASE!,
        accountId: 0,
      },
      keys: {
        amount: 20
      }
    },
    tycho: {
      connection: {
        id: 2000,
        type: "jrpc",
        group: "tycho",
        data: {
          endpoint: process.env.TYCHO_JRPC_ENDPOINT!,
        },
      },
      giver: {
        address: process.env.TYCHO_GIVER_ADDRESS!,
        phrase: process.env.TYCHO_GIVER_PHRASE!,
        accountId: 0,
      },
      keys: {
        phrase: process.env.TYCHO_PHRASE!,
        amount: 20,
      },
    },
  },
  mocha: {
    timeout: 2000000,
  },
};

export default config;
