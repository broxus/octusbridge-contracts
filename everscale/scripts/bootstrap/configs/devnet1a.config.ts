import { Config } from "./";
import { toNano } from "locklift";

const GAS_COEFF = 60;

export const config: Config = {
  RELAYS_COUNT: 3,
  RELAY_ROUND_TIME: 60 * 60 * 24 * 30 * 3, // 3 month
  // Time before the election after round starts
  TIME_BEFORE_SET_RELAYS: 60 * 60 * 24 * 7, // 7 days
  // Min delta between next round start and current election end
  MIN_ROUND_GAP_TIME: 60, // 1 minute

  ETH_STAKING_PROXY: "0xaf46416610F39b49F238d4653F8F204Af7c43Fa7",
  ETH_STAKING_START_TIMESTAMP: 1742928325,
  ETH_MULTI_VAULT_PROXY: "0xaf46416610F39b49F238d4653F8F204Af7c43Fa7",

  ETH_CHAIN_IDS: [],
  ETH_STAKING_RELAY_VERIFIER: "0x5Ba9A218f5dF12C639fbc679291B01f93A2259a4",
  ETH_LAST_BLOCK: {},
  ETH_CONFIRMS_COUNT: {},

  TVM_CHAIN_IDS: [-6001],
  TRANSACTION_CHECKERS: {
    [-6001]: "0:d0a83c5960e3e56b552b6aee0ea507f06fb0f882a8def7fbeff183f0b576600b",
  },
  TVM_EVENT_EMITTERS: {
    [-6001]: {
      alien: "0:7b5ee2aa7bd843bb507154a678b6a2e46034ea41dce26d6aa56d8134542bbc32",
      native: "0:75363a651bc31cc7b654631be433664fa69c6179affc971dd372c4bbfdec6862",
    },
  },

  CONFIG_START_TIMESTAMP: Math.floor(Date.now() / 1000),
  CONFIG_END_TIMESTAMP: 0,
  CONFIG_END_BLOCK: {},

  LIMIT_APPROVER: '',
  WITHDRAWER: '',
  COLD_VAULT: '',
  MANAGER: '',
  WNATIVE_ADDRESSES: [''],

  GAS: {
    ROUND_DEPLOYER_INSTALL_PLATFORM_ONCE: toNano(11 * GAS_COEFF),
    ROUND_DEPLOYER_INSTALL_OR_UPDATE_RELAY_ROUND_CODE: toNano(11 * GAS_COEFF),
    ROUND_DEPLOYER_SET_RELAY_CONFIG: toNano(11 * GAS_COEFF),
    ROUND_DEPLOYER_SET_BRIDGE_EVENT_TON_ETH_CONFIG: toNano(11 * GAS_COEFF),
    ROUND_DEPLOYER_EVENT_INITIAL_BALANCE: toNano(1 * GAS_COEFF),
    ROUND_DEPLOYER_SET_ACTIVE: toNano(11 * GAS_COEFF),

    DEPLOY_ADMIN: toNano(100 * GAS_COEFF),
    DEPLOY_BRIDGE: toNano(1.5 * GAS_COEFF),
    DEPLOY_CONFIGURATION_FACTORY: toNano(1.5 * GAS_COEFF),
    DEPLOY_CONFIGURATION: toNano(2 * GAS_COEFF),
    DEPLOY_CONNECTOR: toNano(2 * GAS_COEFF),
    DEPLOY_ALIEN_TOKEN: toNano(2 * GAS_COEFF),
    DEPLOY_MERGE_ROUTER: toNano(2 * GAS_COEFF),
    DEPLOY_MERGE_POOL: toNano(2 * GAS_COEFF),
    DEPLOY_PROXY_MULTI_VAULT: toNano(1.5 * GAS_COEFF),
    DEPLOY_ROUND_DEPLOYER: toNano(3 * GAS_COEFF),
    DEPLOY_CELL_ENCODER_STANDALONE: toNano(1.5 * GAS_COEFF),

    MERGE_POOL_ADD_TOKEN: toNano(0.5 * GAS_COEFF),
    MERGE_POOL_ENABLE_ALL: toNano(1 * GAS_COEFF),
    MERGE_ROUTER_SET_POOL: toNano(0.5 * GAS_COEFF),

    CONFIGURATION_SET_INITIAL_BALANCE: toNano(0.2 * GAS_COEFF),
    CONFIGURATION_EVENT_INITIAL_BALANCE: toNano(1.5 * GAS_COEFF),
    CONFIGURATION_SET_END: toNano(0.1 * GAS_COEFF),

    PROXY_MULTI_VAULT_SET_MERGE_POOL_PLATFORM: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_MERGE_POOL: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_MERGE_ROUTER: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_EVM_CONFIGURATION: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_EVM_TOKEN_ROOT: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_EVM_TOKEN_WALLET: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_ONCE_EVM_TOKEN_PLATFORM: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_EVENT_ADDRESS_KEEPER: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_LIMIT_APPROVER: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_COLD_VAULT: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_VAULT_WITHDRAWER: toNano(0.5 * GAS_COEFF),
    PROXY_MULTI_VAULT_SET_DAILY_LIMIT: toNano(0.5 * GAS_COEFF),

    CONNECTOR_ENABLE: toNano(0.5 * GAS_COEFF),

    BRIDGE_CONNECTOR_DEPLOY_VALUE: toNano(1 * GAS_COEFF),
  },
};
