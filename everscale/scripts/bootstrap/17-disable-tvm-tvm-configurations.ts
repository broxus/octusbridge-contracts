import { getConfig } from './configs';
import assert from 'node:assert';
import {Contract} from "locklift";
import {TvmTvmEventConfigurationAbi} from "../../build/factorySource";

const config = getConfig();

assert(!!config, 'Config should be defined');

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount('Admin').account;

  for (const chainId of config.TVM_CHAIN_IDS) {
    const alienConfiguration: Contract<TvmTvmEventConfigurationAbi> =
      locklift.deployments.getContract(`NetworkConfig-TvmTvmAlienEvent-${chainId}`);
    await locklift.tracing.trace(
      alienConfiguration.methods.setEndTimestamp({endTimestamp: config?.CONFIG_END_TIMESTAMP}).send({
        from: admin.address,
        amount: config.GAS.CONFIGURATION_SET_END,
        bounce: true,
      }),
    );

    console.log(
      `Disabled alien configuration ${alienConfiguration.address.toString()}, end timestamp: ${config?.CONFIG_END_TIMESTAMP}, chain id: ${chainId}`,
    );

    const nativeConfiguration: Contract<TvmTvmEventConfigurationAbi> =
      locklift.deployments.getContract(`NetworkConfig-TvmTvmNativeEvent-${chainId}`);
    await locklift.tracing.trace(
      nativeConfiguration.methods.setEndTimestamp({endTimestamp: config?.CONFIG_END_TIMESTAMP}).send({
        from: admin.address,
        amount: config.GAS.CONFIGURATION_SET_END,
        bounce: true,
      }),
    );

    console.log(
      `Disabled native configuration ${nativeConfiguration.address.toString()}, end timestamp: ${config?.CONFIG_END_TIMESTAMP}, chain id: ${chainId}`,
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
