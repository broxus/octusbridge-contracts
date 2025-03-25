import { Contract } from "locklift";
import { BigNumber } from "bignumber.js";
import { Account } from "everscale-standalone-client/nodejs";
import { getConfig } from "./configs";
import assert from "node:assert";

import {
  BridgeAbi,
  MultiVaultEVMEverscaleEventAlienAbi,
  MultiVaultEverscaleEVMEventAlienAbi,
  EthereumEverscaleEventConfigurationFactoryAbi,
  EverscaleEthereumEventConfigurationFactoryAbi,
  TvmTvmEventConfigurationFactoryAbi,
  ProxyMultiVaultAlien_V9Abi,
  ProxyMultiVaultNative_V7Abi,
  RoundDeployerAbi,
} from "../../build/factorySource";

const config = getConfig();

assert(!!config, "Config should be defined");

const START_TIMESTAMP = Math.floor(Date.now() / 1000);

const ALIEN_TRANSFER_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: false, internalType: "uint256", name: "base_chainId", type: "uint256" },
    { indexed: false, internalType: "uint160", name: "base_token", type: "uint160" },
    { indexed: false, internalType: "string", name: "name", type: "string" },
    { indexed: false, internalType: "string", name: "symbol", type: "string" },
    { indexed: false, internalType: "uint8", name: "decimals", type: "uint8" },
    { indexed: false, internalType: "uint128", name: "amount", type: "uint128" },
    { indexed: false, internalType: "int8", name: "recipient_wid", type: "int8" },
    { indexed: false, internalType: "uint256", name: "recipient_addr", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "expected_evers", type: "uint256" },
    { indexed: false, internalType: "bytes", name: "payload", type: "bytes" },
  ],
  name: "AlienTransfer",
  type: "event",
};

const NATIVE_TRANSFER_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: false, internalType: "int8", name: "native_wid", type: "int8" },
    { indexed: false, internalType: "uint256", name: "native_addr", type: "uint256" },
    { indexed: false, internalType: "uint128", name: "amount", type: "uint128" },
    { indexed: false, internalType: "int8", name: "recipient_wid", type: "int8" },
    { indexed: false, internalType: "uint256", name: "recipient_addr", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "expected_evers", type: "uint256" },
    { indexed: false, internalType: "bytes", name: "payload", type: "bytes" },
  ],
  name: "NativeTransfer",
  type: "event",
};

const EVER_ALIEN_TRANSFER_EVENT_ABI = [
  { name: "token", type: "uint160" },
  { name: "amount", type: "uint128" },
  { name: "recipient", type: "uint160" },
  { name: "chainId", type: "uint256" },
  { name: "callback_recipient", type: "uint160" },
  { name: "callback_payload", type: "bytes" },
  { name: "callback_strict", type: "bool" },
];

const EVER_NATIVE_TRANSFER_EVENT_ABI = [
  { name: "token_wid", type: "int8" },
  { name: "token_addr", type: "uint256" },
  { name: "name", type: "string" },
  { name: "symbol", type: "string" },
  { name: "decimals", type: "uint8" },
  { name: "amount", type: "uint128" },
  { name: "recipient", type: "uint160" },
  { name: "chainId", type: "uint256" },
  { name: "callback_recipient", type: "uint160" },
  { name: "callback_payload", type: "bytes" },
  { name: "callback_strict", type: "bool" },
];

const deployConnectors = async (
  admin: Account,
  bridge: Contract<BridgeAbi>,
  configurations: Contract<MultiVaultEVMEverscaleEventAlienAbi | MultiVaultEverscaleEVMEventAlienAbi>[],
): Promise<void> => {
  for (const configuration of configurations) {
    const { traceTree: ttConnector } = await locklift.tracing.trace(
      bridge.methods.deployConnector({ _eventConfiguration: configuration.address }).send({
        from: admin.address,
        amount: config?.GAS.DEPLOY_CONNECTOR,
        bounce: true,
      }),
    );

    const connector = locklift.factory.getDeployedContract(
      "Connector",
      ttConnector!.findEventsForContract({ contract: bridge, name: "ConnectorDeployed" as const })[0].connector,
    );

    await locklift.deployments.saveContract({
      contractName: "Connector",
      address: connector.address,
      deploymentName: `Connector-${configuration.address.toString()}`,
    });

    await locklift.tracing.trace(
      connector.methods.enable({}).send({
        from: admin.address,
        amount: config?.GAS.CONNECTOR_ENABLE,
        bounce: true,
      }),
    );

    console.log(`${configuration.address} Connector: ${connector.address}`);
  }
};

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount("Admin").account;

  const ethEverEventConfigFactory =
    locklift.deployments.getContract<EthereumEverscaleEventConfigurationFactoryAbi>("EthEverEventConfigFactory");
  const everEthEventConfigFactory =
    locklift.deployments.getContract<EverscaleEthereumEventConfigurationFactoryAbi>("EverEthEventConfigFactory");
  const tvmTvmEventConfigFactory =
    locklift.deployments.getContract<TvmTvmEventConfigurationFactoryAbi>("TvmTvmEventConfigFactory");
  const proxyMultiVaultAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V9Abi>("ProxyMultiVaultAlien");
  const proxyMultiVaultNative = locklift.deployments.getContract<ProxyMultiVaultNative_V7Abi>("ProxyMultiVaultNative");
  const bridge = locklift.deployments.getContract<BridgeAbi>("Bridge");
  const roundDeployer = locklift.deployments.getContract<RoundDeployerAbi>("RoundDeployer");

  const ethEverFactoryConfigCode = await ethEverEventConfigFactory.methods.configurationCode().call();
  const everEthFactoryConfigCode = await everEthEventConfigFactory.methods.configurationCode().call();
  const tvmTvmFactoryConfigCode = await tvmTvmEventConfigFactory.methods.configurationCode().call();

  assert(
    ethEverFactoryConfigCode.configurationCode ===
      locklift.factory.getContractArtifacts("EthereumEverscaleEventConfiguration").code,
    "Different config codes on eth ever factory",
  );
  assert(
    everEthFactoryConfigCode.configurationCode ===
      locklift.factory.getContractArtifacts("EverscaleEthereumEventConfiguration").code,
    "Different config codes on ever eth factory",
  );
  assert(
    tvmTvmFactoryConfigCode.configurationCode ===
    locklift.factory.getContractArtifacts("TvmTvmEventConfiguration").code,
    "Different config codes on tvm tvm factory",
  );

  for (const chainId of config.TVM_CHAIN_IDS) {
    if (!locklift.deployments.deploymentsStore[`NetworkConfig-TvmTvmAlienEvent-${chainId}`]) {
      const tvmTvmAlienConfiguration = {
        _owner: admin.address,
        _flags: 2,
        basicConfiguration: {
          eventABI: Buffer.from(JSON.stringify(ALIEN_TRANSFER_EVENT_ABI)).toString("base64"),
          staking: roundDeployer.address,
          eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
          eventCode: locklift.factory.getContractArtifacts("MultiVaultTvmTvmEventAlien").code,
        },
        networkConfiguration: {
          chainId: chainId,
          proxy: proxyMultiVaultAlien.address,
          startTimestamp: START_TIMESTAMP,
          endTimestamp: 0,
        },
      };

      await locklift.tracing.trace(
        tvmTvmEventConfigFactory.methods.deploy(tvmTvmAlienConfiguration).send({
          from: admin.address,
          amount: config?.GAS.DEPLOY_CONFIGURATION,
          bounce: true,
        }),
      );

      const tvmTvmAlienConfig = await tvmTvmEventConfigFactory.methods
        .deriveConfigurationAddress({
          networkConfiguration: tvmTvmAlienConfiguration.networkConfiguration,
          basicConfiguration: tvmTvmAlienConfiguration.basicConfiguration,
        })
        .call()
        .then(r => locklift.factory.getDeployedContract("TvmTvmEventConfiguration", r.value0));

      console.log(`TvmTvmAlienEventConfig-${chainId}: ${tvmTvmAlienConfig.address}`);

      await locklift.deployments.saveContract({
        contractName: "TvmTvmEventConfiguration",
        address: tvmTvmAlienConfig.address,
        deploymentName: `NetworkConfig-TvmTvmAlienEvent-${chainId}`,
      });

      await deployConnectors(admin, bridge, [tvmTvmAlienConfig] as never[]);
    }

    if (!locklift.deployments.deploymentsStore[`NetworkConfig-TvmTvmNativeEvent-${chainId}`]) {
      const tvmTvmNativeConfiguration = {
        _owner: admin.address,
        _flags: 10,
        basicConfiguration: {
          eventABI: Buffer.from(JSON.stringify(NATIVE_TRANSFER_EVENT_ABI)).toString("base64"),
          staking: roundDeployer.address,
          eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
          eventCode: locklift.factory.getContractArtifacts("MultiVaultTvmTvmEventNative").code,
        },
        networkConfiguration: {
          chainId: chainId,
          proxy: proxyMultiVaultNative.address,
          startTimestamp: START_TIMESTAMP,
          endTimestamp: 0,
        },
      };

      await locklift.tracing.trace(
        tvmTvmEventConfigFactory.methods.deploy(tvmTvmNativeConfiguration).send({
          from: admin.address,
          amount: config?.GAS.DEPLOY_CONFIGURATION,
          bounce: true,
        }),
      );

      const tvmTvmNativeConfig = await tvmTvmEventConfigFactory.methods
        .deriveConfigurationAddress({
          basicConfiguration: tvmTvmNativeConfiguration.basicConfiguration,
          networkConfiguration: tvmTvmNativeConfiguration.networkConfiguration,
        })
        .call()
        .then(r => locklift.factory.getDeployedContract("TvmTvmEventConfiguration", r.value0));

      console.log(`TvmTvmNativeEventConfig-${chainId}: ${tvmTvmNativeConfig.address}`);

      await locklift.deployments.saveContract({
        contractName: "TvmTvmEventConfiguration",
        address: tvmTvmNativeConfig.address,
        deploymentName: `NetworkConfig-TvmTvmNativeEvent-${chainId}`,
      });

      await deployConnectors(admin, bridge, [tvmTvmNativeConfig] as never[]);
    }
  }

  for (const chainId of config.ETH_CHAIN_IDS) {
    if (!locklift.deployments.deploymentsStore[`NetworkConfig-EthEverAlienEvent-${chainId}`]) {
      const ethEverAlienConfiguration = {
        _owner: admin.address,
        _flags: 2,
        basicConfiguration: {
          eventABI: Buffer.from(JSON.stringify(ALIEN_TRANSFER_EVENT_ABI)).toString("base64"),
          staking: roundDeployer.address,
          eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
          eventCode: locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventAlien").code,
        },
        networkConfiguration: {
          chainId: chainId,
          eventEmitter: new BigNumber(config.ETH_MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
          eventBlocksToConfirm: config.ETH_CONFIRMS_COUNT[chainId],
          proxy: proxyMultiVaultAlien.address,
          startBlockNumber: config.ETH_LAST_BLOCK[chainId],
          endBlockNumber: 0,
        },
      };

      await locklift.tracing.trace(
        ethEverEventConfigFactory.methods.deploy(ethEverAlienConfiguration).send({
          from: admin.address,
          amount: config?.GAS.DEPLOY_CONFIGURATION,
          bounce: true,
        }),
      );

      const ethEverAlienConfig = await ethEverEventConfigFactory.methods
        .deriveConfigurationAddress({
          networkConfiguration: ethEverAlienConfiguration.networkConfiguration,
          basicConfiguration: ethEverAlienConfiguration.basicConfiguration,
        })
        .call()
        .then(r => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

      console.log(`EthEverAlienEventConfig-${chainId}: ${ethEverAlienConfig.address}`);

      await locklift.deployments.saveContract({
        contractName: "EthereumEverscaleEventConfiguration",
        address: ethEverAlienConfig.address,
        deploymentName: `NetworkConfig-EthEverAlienEvent-${chainId}`,
      });

      await deployConnectors(admin, bridge, [ethEverAlienConfig] as never[]);
    }

    if (!locklift.deployments.deploymentsStore[`NetworkConfig-EthEverNativeEvent-${chainId}`]) {
      const ethEverNativeConfiguration = {
        _owner: admin.address,
        _flags: 10,
        basicConfiguration: {
          eventABI: Buffer.from(JSON.stringify(NATIVE_TRANSFER_EVENT_ABI)).toString("base64"),
          staking: roundDeployer.address,
          eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
          eventCode: locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventNative").code,
        },
        networkConfiguration: {
          chainId: chainId,
          eventEmitter: new BigNumber(config.ETH_MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
          eventBlocksToConfirm: config.ETH_CONFIRMS_COUNT[chainId],
          proxy: proxyMultiVaultNative.address,
          startBlockNumber: config.ETH_LAST_BLOCK[chainId],
          endBlockNumber: 0,
        },
      };

      await locklift.tracing.trace(
        ethEverEventConfigFactory.methods.deploy(ethEverNativeConfiguration).send({
          from: admin.address,
          amount: config?.GAS.DEPLOY_CONFIGURATION,
          bounce: true,
        }),
      );

      const ethEverNativeConfig = await ethEverEventConfigFactory.methods
        .deriveConfigurationAddress({
          basicConfiguration: ethEverNativeConfiguration.basicConfiguration,
          networkConfiguration: ethEverNativeConfiguration.networkConfiguration,
        })
        .call()
        .then(r => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

      console.log(`EthEverNativeEventConfig-${chainId}: ${ethEverNativeConfig.address}`);

      await locklift.deployments.saveContract({
        contractName: "EthereumEverscaleEventConfiguration",
        address: ethEverNativeConfig.address,
        deploymentName: `NetworkConfig-EthEverNativeEvent-${chainId}`,
      });

      await deployConnectors(admin, bridge, [ethEverNativeConfig] as never[]);
    }
  }

  if (!locklift.deployments.deploymentsStore["NetworkConfig-EverEthAlienEvent"]) {
    const everEthAlienConfiguration = {
      _owner: admin.address,
      _flags: 0,
      basicConfiguration: {
        eventABI: Buffer.from(JSON.stringify(EVER_ALIEN_TRANSFER_EVENT_ABI)).toString("base64"),
        staking: roundDeployer.address,
        eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
        eventCode: locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventAlien").code,
      },
      networkConfiguration: {
        eventEmitter: proxyMultiVaultAlien.address,
        proxy: new BigNumber(config.ETH_MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
        startTimestamp: START_TIMESTAMP,
        endTimestamp: 0,
      },
    };

    await locklift.tracing.trace(
      everEthEventConfigFactory.methods.deploy(everEthAlienConfiguration).send({
        from: admin.address,
        amount: config?.GAS.DEPLOY_CONFIGURATION,
        bounce: true,
      }),
    );

    const everEthAlienConfig = await everEthEventConfigFactory.methods
      .deriveConfigurationAddress({
        basicConfiguration: everEthAlienConfiguration.basicConfiguration,
        networkConfiguration: everEthAlienConfiguration.networkConfiguration,
      })
      .call()
      .then(r => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

    console.log(`EverEthAlienEventConfig: ${everEthAlienConfig.address}`);

    await locklift.deployments.saveContract({
      contractName: "EverscaleEthereumEventConfiguration",
      address: everEthAlienConfig.address,
      deploymentName: `NetworkConfig-EverEthAlienEvent`,
    });

    await deployConnectors(admin, bridge, [everEthAlienConfig] as never[]);
  }

  if (!locklift.deployments.deploymentsStore["NetworkConfig-EverEthNativeEvent"]) {
    const everEthNativeConfiguration = {
      _owner: admin.address,
      _flags: 1,
      basicConfiguration: {
        eventABI: Buffer.from(JSON.stringify(EVER_NATIVE_TRANSFER_EVENT_ABI)).toString("base64"),
        staking: roundDeployer.address,
        eventInitialBalance: config?.GAS.CONFIGURATION_EVENT_INITIAL_BALANCE,
        eventCode: locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventNative").code,
      },
      networkConfiguration: {
        eventEmitter: proxyMultiVaultNative.address,
        proxy: new BigNumber(config.ETH_MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
        startTimestamp: START_TIMESTAMP,
        endTimestamp: 0,
      },
    };

    await locklift.tracing.trace(
      everEthEventConfigFactory.methods.deploy(everEthNativeConfiguration).send({
        from: admin.address,
        amount: config?.GAS.DEPLOY_CONFIGURATION,
        bounce: true,
      }),
    );

    const everEthNativeConfig = await everEthEventConfigFactory.methods
      .deriveConfigurationAddress({
        basicConfiguration: everEthNativeConfiguration.basicConfiguration,
        networkConfiguration: everEthNativeConfiguration.networkConfiguration,
      })
      .call()
      .then(r => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

    console.log(`EverEthNativeEventConfig: ${everEthNativeConfig.address}`);

    await locklift.deployments.saveContract({
      contractName: "EverscaleEthereumEventConfiguration",
      address: everEthNativeConfig.address,
      deploymentName: `NetworkConfig-EverEthNativeEvent`,
    });

    await deployConnectors(admin, bridge, [everEthNativeConfig] as never[]);
  }
};

main().then(() => console.log("Success"));
