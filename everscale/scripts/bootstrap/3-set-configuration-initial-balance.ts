import { toNano } from 'locklift';
import { getConfig } from './configs';
import assert from "node:assert";

import {
    EthereumEverscaleEventConfigurationAbi,
    TvmTvmEventConfigurationAbi,
} from "../../build/factorySource";

const config = getConfig();

assert(!!config, 'Config should be defined');

type InitialBalance = { alien?: string; native?: string };

const initialBalances: Record<number, InitialBalance> = {
    1: { alien: toNano(230), native: toNano(90) },
    56: { alien: toNano(230), native: toNano(90) },
    43114: { alien: toNano(230), native: toNano(90) },
};

const initialBalancesTvm: Record<number, InitialBalance> = {
    123: { alien: toNano(230), native: toNano(90) },
    456: { alien: toNano(230), native: toNano(90) },
};

//TODO:  EverscaleEthereumEventConfiguration

const main = async (): Promise<void> => {
    await locklift.deployments.load();

    const admin = locklift.deployments.getAccount('Admin').account;

    const pendingConfigurationTxs: Promise<unknown>[] = [];

    for (const [chainId, values] of Object.entries(initialBalances)) {
        if (values.alien) {
            const configuration = locklift.deployments.getContract<EthereumEverscaleEventConfigurationAbi>(`NetworkConfig-EthEverAlienEvent-${chainId}`);
            const currentInitialBalance = await configuration.methods
                .getDetails({ answerId: 0 })
                .call()
                .then((r) => r._basicConfiguration.eventInitialBalance);

            if (currentInitialBalance !== values.alien) {
                const tx = locklift.transactions.waitFinalized(
                    configuration.methods
                        .setEventInitialBalance({ eventInitialBalance: values.alien })
                        .send({from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true}),
                ).then(() => console.log(`${configuration.address.toString()} -> ${values.alien}`));

                pendingConfigurationTxs.push(tx);
            }

        }

        if (values.native) {
            const configuration = locklift.deployments.getContract<EthereumEverscaleEventConfigurationAbi>(`NetworkConfig-EthEverNativeEvent-${chainId}`);
            const currentInitialBalance = await configuration.methods
                .getDetails({ answerId: 0 })
                .call()
                .then((r) => r._basicConfiguration.eventInitialBalance);

            if (currentInitialBalance !== values.native) {
                const tx = locklift.transactions.waitFinalized(
                    configuration.methods
                        .setEventInitialBalance({ eventInitialBalance: values.native })
                        .send({from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true}),
                ).then(() => console.log(`${configuration.address.toString()} -> ${values.native}`));

                pendingConfigurationTxs.push(tx);
            }

        }
    }

    await Promise.all(pendingConfigurationTxs);

    const pendingTvmConfigurationTxs: Promise<unknown>[] = [];

    for (const [chainId, values] of Object.entries(initialBalancesTvm)) {
        if (values.alien) {
            const configuration = locklift.deployments.getContract<TvmTvmEventConfigurationAbi>(`NetworkConfig-TvmTvmAlienEvent-${chainId}`);
            const currentInitialBalance = await configuration.methods
              .getDetails({ answerId: 0 })
              .call()
              .then((r) => r._basicConfiguration.eventInitialBalance);

            if (currentInitialBalance !== values.alien) {
                const tx = locklift.transactions.waitFinalized(
                  configuration.methods
                    .setEventInitialBalance({ eventInitialBalance: values.alien })
                    .send({from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true}),
                ).then(() => console.log(`${configuration.address.toString()} -> ${values.alien}`));

                pendingTvmConfigurationTxs.push(tx);
            }
        }

        if (values.native) {
            const configuration = locklift.deployments.getContract<TvmTvmEventConfigurationAbi>(`NetworkConfig-TvmTvmNativeEvent-${chainId}`);
            const currentInitialBalance = await configuration.methods
              .getDetails({ answerId: 0 })
              .call()
              .then((r) => r._basicConfiguration.eventInitialBalance);

            if (currentInitialBalance !== values.native) {
                const tx = locklift.transactions.waitFinalized(
                  configuration.methods
                    .setEventInitialBalance({ eventInitialBalance: values.native })
                    .send({from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true}),
                ).then(() => console.log(`${configuration.address.toString()} -> ${values.native}`));

                pendingTvmConfigurationTxs.push(tx);
            }
        }
    }

    await Promise.all(pendingTvmConfigurationTxs);
};

main().then(() => console.log('Success'));
