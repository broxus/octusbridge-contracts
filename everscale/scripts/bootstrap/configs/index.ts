import { config as localConfig } from "./local.config";
import { config as hmstrConfig } from "./hmstr.config";
import { config as devnet1Config } from "./devnet1.config";
import { config as devnet1aConfig } from "./devnet1a.config";

export type Config = {
  RELAYS_COUNT: number;
  RELAY_ROUND_TIME: number;
  TIME_BEFORE_SET_RELAYS: number;
  MIN_ROUND_GAP_TIME: number;

  ETH_STAKING_PROXY: string;
  ETH_STAKING_START_TIMESTAMP: number;
  ETH_MULTI_VAULT_PROXY: string;

  ETH_CHAIN_IDS: number[];
  ETH_STAKING_RELAY_VERIFIER: string;
  ETH_LAST_BLOCK: Record<number, number>;
  ETH_CONFIRMS_COUNT: Record<number, number>;

  TVM_CHAIN_IDS: number[];
  TRANSACTION_CHECKERS: Record<number, string>;
  TVM_EVENT_EMITTERS: Record<number, { alien: string; native: string }>;

  CONFIG_START_TIMESTAMP: number;
  CONFIG_END_TIMESTAMP: number;
  CONFIG_END_BLOCK: Record<number, number>;;

  // Can approve transfers above limits
  LIMIT_APPROVER: string;

  // Can withdraw tokens from native proxy to cold vault
  WITHDRAWER: string;
  COLD_VAULT: string;

  WNATIVE_ADDRESSES: string[];

  // Can upgrade contracts
  MANAGER: string;

  GAS: Record<string, string>;
};

export const getConfig = (): Config | null => {
  switch (process.env.BOOTSTRAP_ENV) {
    case "local":
      return localConfig;
    case "hmstr":
      return hmstrConfig;
    case "devnet1":
      return devnet1Config;
    case "devnet1a":
      return devnet1aConfig;
    default:
      return null;
  }
};
