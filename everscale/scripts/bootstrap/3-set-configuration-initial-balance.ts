import { getConfig } from "./configs";
import assert from "node:assert";

import {
  EthereumEverscaleEventConfigurationAbi,
  GasValuesAbi,
  TvmTvmEventConfigurationAbi,
} from "../../build/factorySource";
import { BigNumber } from "bignumber.js";

const config = getConfig();

assert(!!config, "Config should be defined");

const evmChainIds: number[] = [56];
const tvmChainIds: number[] = [-3];

//TODO:  EverscaleEthereumEventConfiguration

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount("Admin").account;
  const gasValues = locklift.deployments.getContract<GasValuesAbi>("GasValues");

  const pendingConfigurationTxs: Promise<unknown>[] = [];

  for (const chainId of evmChainIds) {
    const alienConfiguration = locklift.deployments.getContract<EthereumEverscaleEventConfigurationAbi>(
      `NetworkConfig-EthEverAlienEvent-${chainId}`,
    );
    const currentAlienInitialBalance = await alienConfiguration.methods
      .getDetails({ answerId: 0 })
      .call()
      .then(r => r._basicConfiguration.eventInitialBalance);

    const targetAlienEventInitialValue = await gasValues.methods
      .getEvmTvmAlienEventInitialBalance({
        relaysCount: config?.RELAYS_COUNT,
        deployMergeRouter: false,
        deployTokenRoot: false,
      })
      .call()
      .then(r =>
        new BigNumber(r.value0.eventInitialGas.dynamicGas)
          .multipliedBy(config?.GAS_PRICE)
          .plus(r.value0.eventInitialGas.fixedValue)
          .toString(),
      );

    if (currentAlienInitialBalance !== targetAlienEventInitialValue) {
      const tx = locklift.transactions
        .waitFinalized(
          alienConfiguration.methods
            .setEventInitialBalance({ eventInitialBalance: targetAlienEventInitialValue })
            .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true }),
        )
        .then(() => console.log(`${alienConfiguration.address.toString()} -> ${targetAlienEventInitialValue}`));

      pendingConfigurationTxs.push(tx);
    }

    const nativeConfiguration = locklift.deployments.getContract<EthereumEverscaleEventConfigurationAbi>(
      `NetworkConfig-EthEverNativeEvent-${chainId}`,
    );
    const currentNativeInitialBalance = await nativeConfiguration.methods
      .getDetails({ answerId: 0 })
      .call()
      .then(r => r._basicConfiguration.eventInitialBalance);

    const targetNativeEventInitialValue = await gasValues.methods
      .getEvmTvmNativeEventInitialBalance({
        relaysCount: config?.RELAYS_COUNT,
      })
      .call()
      .then(r =>
        new BigNumber(r.value0.eventInitialGas.dynamicGas)
          .multipliedBy(config?.GAS_PRICE)
          .plus(r.value0.eventInitialGas.fixedValue)
          .toString(),
      );

    if (currentNativeInitialBalance !== targetNativeEventInitialValue) {
      const tx = locklift.transactions
        .waitFinalized(
          nativeConfiguration.methods
            .setEventInitialBalance({ eventInitialBalance: targetNativeEventInitialValue })
            .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true }),
        )
        .then(() => console.log(`${nativeConfiguration.address.toString()} -> ${targetNativeEventInitialValue}`));

      pendingConfigurationTxs.push(tx);
    }
  }

  await Promise.all(pendingConfigurationTxs);

  const pendingTvmConfigurationTxs: Promise<unknown>[] = [];

  for (const chainId of tvmChainIds) {
    const alienConfiguration = locklift.deployments.getContract<TvmTvmEventConfigurationAbi>(
      `NetworkConfig-TvmTvmAlienEvent-${chainId}`,
    );
    const currentAlienInitialBalance = await alienConfiguration.methods
      .getDetails({ answerId: 0 })
      .call()
      .then(r => r._basicConfiguration.eventInitialBalance);

    const targetAlienEventInitialValue = await gasValues.methods
      .getTvmTvmAlienEventInitialBalance({
        deployMergeRouter: false,
        deployTokenRoot: false,
      })
      .call()
      .then(r =>
        new BigNumber(r.value0.eventInitialGas.dynamicGas)
          .multipliedBy(config?.GAS_PRICE)
          .plus(r.value0.eventInitialGas.fixedValue)
          .toString(),
      );

    if (currentAlienInitialBalance !== targetAlienEventInitialValue) {
      const tx = locklift.transactions
        .waitFinalized(
          alienConfiguration.methods
            .setEventInitialBalance({ eventInitialBalance: targetAlienEventInitialValue })
            .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true }),
        )
        .then(() => console.log(`${alienConfiguration.address.toString()} -> ${targetAlienEventInitialValue}`));

      pendingTvmConfigurationTxs.push(tx);
    }

    const nativeConfiguration = locklift.deployments.getContract<TvmTvmEventConfigurationAbi>(
      `NetworkConfig-TvmTvmNativeEvent-${chainId}`,
    );
    const currentNativeInitialBalance = await nativeConfiguration.methods
      .getDetails({ answerId: 0 })
      .call()
      .then(r => r._basicConfiguration.eventInitialBalance);

    const targetNativeEventInitialValue = await gasValues.methods
      .getTvmTvmNativeEventInitialBalance()
      .call()
      .then(r =>
        new BigNumber(r.value0.eventInitialGas.dynamicGas)
          .multipliedBy(config?.GAS_PRICE)
          .plus(r.value0.eventInitialGas.fixedValue)
          .toString(),
      );

    if (currentNativeInitialBalance !== targetNativeEventInitialValue) {
      const tx = locklift.transactions
        .waitFinalized(
          nativeConfiguration.methods
            .setEventInitialBalance({ eventInitialBalance: targetNativeEventInitialValue })
            .send({ from: admin.address, amount: config?.GAS.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true }),
        )
        .then(() => console.log(`${nativeConfiguration.address.toString()} -> ${targetNativeEventInitialValue}`));

      pendingTvmConfigurationTxs.push(tx);
    }
  }

  await Promise.all(pendingTvmConfigurationTxs);
};

main().then(() => console.log("Success"));
