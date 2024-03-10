import {LockliftConfig} from "locklift";
import { FactorySource } from "./build/factorySource";
const LOCAL_NETWORK_ENDPOINT = "http://localhost/graphql";

import "locklift-verifier";

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const config: LockliftConfig = {
  verifier: {
    verifierVersion: "latest", // contract verifier binary, see https://github.com/broxus/everscan-verify/releases
    apiKey: "uwJlTyvauW",
    secretKey: "IEx2jg4hqE3V1YUqcVOY",
    // license: "AGPL-3.0-or-later", <- this is default value and can be overrided
  },
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
    proxy: {
      deploy: ["local/"],
      giver: {
        // Check if you need provide custom giver
        address: "0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415",
        key: "172af540e43a524763dd53b26a066d472a97c4de37d5498170564510608250c3",
      },
      connection: {
        id: 1001,
        // @ts-ignore
        type: "proxy",
        // @ts-ignore
        data: {},
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        // phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        amount: 20,
      },
    },
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
    venom_main: {
      connection: {
        id: 1,
        group: "group",
        type: "jrpc",
        data: {
          endpoint: "https://jrpc.venom.foundation"
        },
      },
      giver: {
        address: process.env.VENOM_MAIN_GIVER_ADDRESS ?? "",
        phrase: process.env.VENOM_MAIN_GIVER_PHRASE ?? "",
        accountId: 0,
      },
      keys: {
        amount: 20
      }
    },
  },
  // you can use any settings that mocha framework support
  mocha: {
    timeout: 2000000,
  },
};

export default config;
