import "@broxus/locklift-verifier";
import "@broxus/locklift-deploy";
import "dotenv/config";
import chai from "chai";

import { LockliftConfig, lockliftChai } from "locklift";
import { Deployments } from "@broxus/locklift-deploy";

import { FactorySource } from "./build/factorySource";

chai.use(lockliftChai);

declare module "locklift" {
  //@ts-ignore
  export interface Locklift {
    deployments: Deployments<FactorySource>;
  }
}

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  verifier: {
    verifierVersion: "latest",
    apiKey: process.env.EVERSCAN_API_KEY!,
    secretKey: process.env.EVERSCAN_SECRET_KEY!,
  },
  compiler: {
    version: "0.71.0",
    externalContracts: {
      "../node_modules/ton-eth-bridge-token-contracts/contracts": [
        "TokenRoot",
        "TokenWallet",
        "TokenRootUpgradeable",
        "TokenWalletUpgradeable",
        "TokenWalletPlatform",
      ],
      build_prod: ["Bridge"],
      "../node_modules/@broxus/contracts/contracts/platform": ["Platform"],
    },
    externalContractsArtifacts: {
      // "../node_modules/ton-eth-bridge-token-contracts": ['TokenRootUpgradable', 'TokenWalletUpgradable', 'TokenWalletPlatform'],
      //"build_prod": ['Bridge'],
      "precompiled": ['AlienTokenWalletUpgradeable','TokenRootAlienTVM','TokenWalletPlatform']
    }
  },
  linker: {
    version: "0.20.6",
  },
  networks: {
    locklift: {
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
        phrase: process.env.LOCAL_PHRASE,
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
        phrase: process.env.LOCAL_PHRASE,
        amount: 20,
      },
    },

    tycho: {
      connection: {
        id: 2000,
        type: "jrpc",
        group: "tycho",
        data: {
          endpoint: process.env.TYCHO_NETWORK_ENDPOINT!,
        },
      },
      giver: {
        address: process.env.TYCHO_GIVER_ADDRESS!,
        key: process.env.TYCHO_GIVER_KEY!,
        //phrase: process.env.TYCHO_GIVER_PHRASE!,
        //accountId: 0,
      },
      keys: {
        phrase: process.env.TYCHO_PHRASE!,
        amount: 20,
      },
    },
    devnet1: {
      connection: {
        id: -6001,
        type: "jrpc",
        group: "tycho",
        data: {
          endpoint: process.env.DEVNET1_NETWORK_ENDPOINT!,
        },
      },
      giver: {
        address: process.env.TYCHO_GIVER_ADDRESS!,
        key: process.env.TYCHO_GIVER_KEY!,
        //phrase: process.env.TYCHO_GIVER_PHRASE!,
        //accountId: 0,
      },
      keys: {
        phrase: process.env.TYCHO_PHRASE!,
        amount: 20,
      },
    },
    devnet1a: {
      connection: {
        id: 2000,
        type: "jrpc",
        group: "tycho",
        data: {
          endpoint: process.env.DEVNET1_NETWORK_ENDPOINT!,
        },
      },
      giver: {
        address: process.env.TYCHO_GIVER_ADDRESS!,
        key: process.env.TYCHO_GIVER_KEY!,
        //phrase: process.env.TYCHO_GIVER_PHRASE!,
        //accountId: 0,
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
