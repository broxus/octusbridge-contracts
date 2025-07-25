import { getConfig } from './configs';
import assert from 'node:assert';
import {Contract} from "locklift";
import {EthereumEverscaleEventConfigurationAbi} from "../../build/factorySource";

const config = getConfig();

assert(!!config, 'Config should be defined');

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount('Admin').account;

  for (const chainId of config.ETH_CHAIN_IDS) {
    const alienConfiguration: Contract<EthereumEverscaleEventConfigurationAbi> =
      locklift.deployments.getContract(`NetworkConfig-EthEverAlienEvent-${chainId}`);
    await locklift.tracing.trace(
      alienConfiguration.methods.setEndBlockNumber({endBlockNumber: config?.CONFIG_END_BLOCK[chainId]}).send({
        from: admin.address,
        amount: config.GAS.CONFIGURATION_SET_END,
        bounce: true,
      }),
    );

    console.log(
      `Disabled alien configuration ${alienConfiguration.address.toString()}, end block: ${config?.CONFIG_END_BLOCK[chainId]}, chain id: ${chainId}`,
    );

    const nativeConfiguration: Contract<EthereumEverscaleEventConfigurationAbi> =
      locklift.deployments.getContract(`NetworkConfig-EthEverNativeEvent-${chainId}`);
    await locklift.tracing.trace(
      nativeConfiguration.methods.setEndBlockNumber({endBlockNumber: config?.CONFIG_END_BLOCK[chainId]}).send({
        from: admin.address,
        amount: config.GAS.CONFIGURATION_SET_END,
        bounce: true,
      }),
    );

    console.log(
      `Disabled native configuration ${nativeConfiguration.address.toString()}, end block: ${config?.CONFIG_END_BLOCK[chainId]}, chain id: ${chainId}`,
    );
  }
};

main()
  .then(() => {
    console.log('Success');
  })
  .catch((err: unknown) => {
    console.error(err);
  });
