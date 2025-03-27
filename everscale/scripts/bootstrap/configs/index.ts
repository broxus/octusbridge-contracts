import { config as localConfig } from './local.config';
import { config as hmstrConfig } from './hmstr.config';
import { config as devnet1Config } from './devnet1.config';
import { config as devnet1aConfig } from './devnet1a.config';

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
    TRANSACTION_CHECKER: string;
    TVM_EVENT_EMITTERS: Record<number, { alien: string; native: string; }>;

    GAS: Record<string, string>;
};

export const getConfig = (): Config | null => {
    switch (process.env.BOOTSTRAP_ENV) {
        case 'local': return localConfig;
        case 'hmstr': return hmstrConfig;
        case 'devnet1': return devnet1Config;
        case 'devnet1a': return devnet1aConfig;
        default: return null;
    }
};
