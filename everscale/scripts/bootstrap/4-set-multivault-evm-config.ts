import { ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi } from "../../build/factorySource";

import { getConfig } from "./configs";
import assert from "node:assert";
import { Address } from "locklift";

const config = getConfig();

assert(!!config, 'Config should be defined');

const DISABLE_CONFIGURATIONS: { address: Address, endBlock?: string, endTimestamp?: string }[] = [
    // { address: new Address('0:40592b4a49ff62b25b2b97658b51b29402c337b7c45490e585e855bebd1d8583'), endBlock: '50802794' },
    // { address: new Address('0:ea5bb42c770acfcc87666b12b543540ae7ec2d91c9ad5322013ff30642167e77'), endBlock: '50802794' },
    // { address: new Address('0:fc038f544db4d6c8c17e3d0a6d21aaf7f49c07b825d2291fbfa169b18e508fb1'), endTimestamp: '1748948079' },
    // { address: new Address('0:c7811b41fc80051c7d8a6696bb52189c7a77da7118b13ee832d093d796e3a97e'), endTimestamp: '1748948079' }
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
