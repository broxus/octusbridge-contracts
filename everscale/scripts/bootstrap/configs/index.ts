import { config as localConfig } from './local.config';
import { config as hmstrConfig } from './hmstr.config';

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

    GAS: Record<string, string>;
};

export const getConfig = (): Config | null => {
    switch (process.env.BOOTSTRAP_ENV) {
        case 'local': return localConfig;
        case 'hmstr': return hmstrConfig;
        default: return null;
    }
};
