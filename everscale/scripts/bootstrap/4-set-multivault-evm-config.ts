import { ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi } from "../../build/factorySource";

import { getConfig } from "./configs";
import assert from "node:assert";
import { Address } from "locklift";

const config = getConfig();

assert(!!config, 'Config should be defined');

const DISABLE_CONFIGURATIONS: { address: Address, endBlock?: string, endTimestamp?: string }[] = [
    // { address: new Address('0:4434c3cce49b599be1b6d61a263e457cfe86a2cde44093d41233a80790cf2f93'), endBlock: '46144686' },
    // { address: new Address('0:413ffdab72ff670b87f0027a3c590e0609625922a990f03912227adb50bc11ba'), endTimestamp: '46144686' }
];

const main = async (): Promise<void> => {
    const admin = locklift.deployments.getAccount('Admin').account;
    const proxyMultiVaultAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>('ProxyMultiVaultAlien');
    const proxyMultiVaultNative = locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>('ProxyMultiVaultNative');

    console.log('Set ProxyMultiVaultAlienJetton EVM configuration...');

    const alienEvmConfigurations = Object.keys(locklift.deployments.deploymentsStore)
        .filter((n) => n.startsWith('NetworkConfig-EthEverAlien'))
        .map((r) => locklift.deployments.getContract(r).address);

    await locklift.tracing.trace(
        proxyMultiVaultAlien.methods
            .setEVMConfiguration({
                _everscaleConfiguration: locklift.deployments.getContract('NetworkConfig-EverEthAlienEvent').address,
                _evmConfigurations: alienEvmConfigurations,
                _remainingGasTo: admin.address,
            })
            .send({
                from: admin.address,
                amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_CONFIGURATION,
                bounce: true,
            })
    );

    console.log('Set ProxyMultiVaultNativeJetton EVM configuration...');

    const nativeEvmConfigurations = Object.keys(locklift.deployments.deploymentsStore)
        .filter((n) => n.startsWith('NetworkConfig-EthEverNative'))
        .map((r) => locklift.deployments.getContract(r).address);

    await locklift.tracing.trace(
        proxyMultiVaultNative.methods
            .setEVMConfiguration({
                _config: {
                    everscaleConfiguration: locklift.deployments.getContract('NetworkConfig-EverEthNativeEvent').address,
                    evmConfigurations: nativeEvmConfigurations,
                },
                remainingGasTo: admin.address,
            })
            .send({
                from: admin.address,
                amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_CONFIGURATION,
                bounce: true,
            })
    );

    console.log('Set ProxyMultiVaultAlien TVM configuration...');

    const alienTvmConfigurations = Object.keys(locklift.deployments.deploymentsStore)
        .filter((n) => n.startsWith('NetworkConfig-TvmTvmAlien'))
        .map((r) => locklift.deployments.getContract(r).address);

    await locklift.tracing.trace(
        proxyMultiVaultAlien.methods
            .setTVMConfiguration({
                _incomingConfigurations: alienTvmConfigurations,
                _remainingGasTo: admin.address,
            })
            .send({
          from: admin.address,
          amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_CONFIGURATION,
          bounce: true,
        })
    );

    console.log('Set ProxyMultiVaultNative TVM configuration...');

    const nativeTvmConfigurations = Object.keys(locklift.deployments.deploymentsStore)
        .filter((n) => n.startsWith('NetworkConfig-TvmTvmNative'))
        .map((r) => locklift.deployments.getContract(r).address);

    await locklift.tracing.trace(
        proxyMultiVaultNative.methods
            .setTVMConfiguration({
              _incomingConfigurations: nativeTvmConfigurations,
              remainingGasTo: admin.address,
            })
            .send({
          from: admin.address,
          amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_CONFIGURATION,
          bounce: true,
        })
    );

    for (const conf of DISABLE_CONFIGURATIONS) {
        if (conf.endBlock) {
            const cont = locklift.factory.getDeployedContract('EthereumEverscaleEventConfiguration', conf.address);

            await locklift.transactions.waitFinalized(
                cont.methods
                    .setEndBlockNumber({ endBlockNumber: conf.endBlock })
                    .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_END, bounce: true }),
            );

            console.log(`Disabled configuration ${conf.address.toString()}, end block: ${conf.endBlock}`);

            continue;
        }

        const cont = locklift.factory.getDeployedContract('EverscaleEthereumEventConfiguration', conf.address);

        await locklift.transactions.waitFinalized(
            cont.methods
                .setEndTimestamp({ endTimestamp: conf.endTimestamp! })
                .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_END, bounce: true }),
        );

        console.log(`Disabled configuration ${conf.address.toString()}, end timestamp: ${conf.endTimestamp}`)
    }
}

main().then(() => console.log('Success'));
