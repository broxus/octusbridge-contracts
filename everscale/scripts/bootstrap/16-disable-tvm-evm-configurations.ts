import { getConfig } from './configs';
import assert from 'node:assert';
import {Contract} from "locklift";
import {EverscaleEthereumEventConfigurationAbi} from "../../build/factorySource";

const config = getConfig();

assert(!!config, 'Config should be defined');

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount('Admin').account;

  const alienConfiguration: Contract<EverscaleEthereumEventConfigurationAbi> =
    locklift.deployments.getContract("NetworkConfig-EverEthAlienEvent");
  await locklift.tracing.trace(
    alienConfiguration.methods.setEndTimestamp({endTimestamp: config?.CONFIG_END_TIMESTAMP}).send({
      from: admin.address,
      amount: config.GAS.CONFIGURATION_SET_END,
      bounce: true,
    }),
  );

  console.log(
    `Disabled alien configuration ${alienConfiguration.address.toString()}, end timestamp: ${config?.CONFIG_END_TIMESTAMP}`,
  );

  const nativeConfiguration: Contract<EverscaleEthereumEventConfigurationAbi> =
    locklift.deployments.getContract(`NetworkConfig-EverEthNativeEvent`);
  await locklift.tracing.trace(
    nativeConfiguration.methods.setEndTimestamp({endTimestamp: config?.CONFIG_END_TIMESTAMP}).send({
      from: admin.address,
      amount: config.GAS.CONFIGURATION_SET_END,
      bounce: true,
    }),
  );

  console.log(
    `Disabled native configuration ${nativeConfiguration.address.toString()}, end timestamp: ${config?.CONFIG_END_TIMESTAMP}`,
  );
};

main()
  .then(() => {
    console.log('Success');
  })
  .catch((err: unknown) => {
    console.error(err);
  });
