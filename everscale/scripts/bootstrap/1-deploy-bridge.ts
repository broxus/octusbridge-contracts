import { Contract, getRandomNonce, Signer, WalletTypes, zeroAddress, Address } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { BigNumber } from "bignumber.js";
import assert from "node:assert";
import { getConfig } from "./configs";

import {
  BridgeAbi,
  EthereumEverscaleEventConfigurationAbi,
  EthereumEverscaleEventConfigurationFactoryAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleEthereumEventConfigurationFactoryAbi,
  TvmTvmEventConfigurationAbi,
  TvmTvmEventConfigurationFactoryAbi,
  RoundDeployerAbi,
} from "../../build/factorySource";

const config = getConfig();

assert(!!config, "Config should be defined");

const setupRoundDeployerParams = async (roundDeployer: Contract<RoundDeployerAbi>, admin: Account): Promise<void> => {
  const platformArtifacts = locklift.factory.getContractArtifacts("Platform");

  await locklift.tracing.trace(
    roundDeployer.methods
      .installPlatformOnce({
        code: platformArtifacts.code,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.ROUND_DEPLOYER_INSTALL_PLATFORM_ONCE,
        bounce: true,
      }),
  );

  console.log(`Set platform code to round deployer. Code hash: ${platformArtifacts.codeHash}`);

  const relayRoundArtifacts = locklift.factory.getContractArtifacts("RelayRound");

  await locklift.tracing.trace(
    roundDeployer.methods
      .installOrUpdateRelayRoundCode({
        code: relayRoundArtifacts.code,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.ROUND_DEPLOYER_INSTALL_OR_UPDATE_RELAY_ROUND_CODE,
        bounce: true,
      }),
  );

  console.log(`Set relay round code to round deployer. Code hash: ${relayRoundArtifacts.codeHash}`);

  await locklift.tracing.trace(
    roundDeployer.methods
      .setRelayConfig({
        new_relay_config: {
          minRelaysCount: config.RELAYS_COUNT,
          relayRoundTime: config.RELAY_ROUND_TIME,
          timeBeforeSetRelays: config.TIME_BEFORE_SET_RELAYS,
          minRoundGapTime: config.MIN_ROUND_GAP_TIME,
        },
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.ROUND_DEPLOYER_SET_RELAY_CONFIG,
        bounce: true,
      }),
  );

  console.log("Set relay config to round deployer");
};

const deployConfigFactories = async (
  signer: Signer,
): Promise<{
  ethEverEventConfigFactory: Contract<EthereumEverscaleEventConfigurationFactoryAbi>;
  everEthEventConfigFactory: Contract<EverscaleEthereumEventConfigurationFactoryAbi>;
  tvmTvmEventConfigFactory: Contract<TvmTvmEventConfigurationFactoryAbi>;
}> => {
  const { contract: ethEverEventConfigFactory } = await locklift.factory.deployContract({
    contract: "EthereumEverscaleEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("EthereumEverscaleEventConfiguration").code,
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_CONFIGURATION_FACTORY,
  });

  await locklift.deployments.saveContract({
    contractName: "EthereumEverscaleEventConfigurationFactory",
    address: ethEverEventConfigFactory.address,
    deploymentName: "EthEverEventConfigFactory",
  });

  console.log(`EthEverEventConfigFactory: ${ethEverEventConfigFactory.address}`);

  const { contract: everEthEventConfigFactory } = await locklift.factory.deployContract({
    contract: "EverscaleEthereumEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("EverscaleEthereumEventConfiguration").code,
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_CONFIGURATION_FACTORY,
  });

  await locklift.deployments.saveContract({
    contractName: "EverscaleEthereumEventConfigurationFactory",
    address: everEthEventConfigFactory.address,
    deploymentName: "EverEthEventConfigFactory",
  });

  console.log(`EverEthEventConfigFactory: ${everEthEventConfigFactory.address}`);

  const { contract: tvmTvmEventConfigFactory } = await locklift.factory.deployContract({
    contract: "TvmTvmEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("TvmTvmEventConfiguration").code,
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_CONFIGURATION_FACTORY,
  });

  await locklift.deployments.saveContract({
    contractName: "TvmTvmEventConfigurationFactory",
    address: tvmTvmEventConfigFactory.address,
    deploymentName: "TvmTvmEventConfigFactory",
  });

  console.log(`TvmTvmEventConfigFactory: ${tvmTvmEventConfigFactory.address}`);

  return {
    ethEverEventConfigFactory,
    everEthEventConfigFactory,
    tvmTvmEventConfigFactory,
  };
};

const deployMultiVaults = async (admin: Account, signer: Signer): Promise<void> => {
  const { contract: proxyAlien } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultAlien_V9",
    constructorParams: { owner_: admin.address },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_PROXY_MULTI_VAULT,
  });

  await locklift.deployments.saveContract({
    contractName: "ProxyMultiVaultAlien_V9",
    address: proxyAlien.address,
    deploymentName: "ProxyMultiVaultAlien",
  });

  console.log(`ProxyMultiVaultAlien: ${proxyAlien.address}`);

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergePoolPlatform({
        _mergePoolPlatform: locklift.factory.getContractArtifacts("MergePoolPlatform").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_MERGE_POOL_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set merge pool platform code to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("MergePoolPlatform").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergePool({
        _mergePool: locklift.factory.getContractArtifacts("MergePool_V6").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_MERGE_POOL,
        bounce: true,
      }),
  );

  console.log(
    `Set merge pool code to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("MergePool_V6").codeHash}`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergeRouter({
        _mergeRouter: locklift.factory.getContractArtifacts("MergeRouter").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_MERGE_ROUTER,
        bounce: true,
      }),
  );

  console.log(
    `Set merge router to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("MergeRouter").codeHash}`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setEVMAlienTokenRootCode({
        _tokenRootCode: locklift.factory.getContractArtifacts("TokenRootAlienEVM").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_TOKEN_ROOT,
        bounce: true,
      }),
  );

  console.log(
    `Set EVM token root to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("TokenRootAlienEVM").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setEVMAlienTokenWalletCode({
        _tokenWalletCode: locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_TOKEN_WALLET,
        bounce: true,
      }),
  );

  console.log(
    `Set EVM token wallet to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setOnceEVMAlienTokenPlatformCode({
        _tokenPlatformCode: locklift.factory.getContractArtifacts("AlienTokenWalletPlatform").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_ONCE_EVM_TOKEN_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set EVM token platform to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("AlienTokenWalletPlatform").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setTVMAlienTokenRootCode({
        _tokenRootCode: locklift.factory.getContractArtifacts("TokenRootAlienTVM").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_TOKEN_ROOT,
        bounce: true,
      }),
  );

  console.log(
    `Set TVM token root to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("TokenRootAlienTVM").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setTVMAlienTokenWalletCode({
        _tokenWalletCode: locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_EVM_TOKEN_WALLET,
        bounce: true,
      }),
  );

  console.log(
    `Set TVM token wallet to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setOnceTVMAlienTokenPlatformCode({
        _tokenPlatformCode: locklift.factory.getContractArtifacts("AlienTokenWalletPlatform").code,
        _remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_ONCE_EVM_TOKEN_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set TVM token platform to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("AlienTokenWalletPlatform").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setPlatformCode({
        _code: locklift.factory.getContractArtifacts("Platform").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set platform code to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("Platform").codeHash}`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods
      .setTokenFeeCode({
        _code: locklift.factory.getContractArtifacts("BridgeTokenFee").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_TOKEN_FEE,
        bounce: true,
      }),
  );

  console.log(
    `Set token fee code to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("BridgeTokenFee").codeHash}`,
  );

  const { contract: proxyNative } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultNative_V7",
    constructorParams: { owner_: admin.address },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_PROXY_MULTI_VAULT,
  });

  await locklift.deployments.saveContract({
    contractName: "ProxyMultiVaultNative_V7",
    address: proxyNative.address,
    deploymentName: "ProxyMultiVaultNative",
  });

  console.log(`ProxyMultiVaultNative: ${proxyNative.address}`);

  await locklift.tracing.trace(
    proxyNative.methods
      .setPlatformCode({
        _code: locklift.factory.getContractArtifacts("Platform").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set platform code to native proxy. Code hash: ${locklift.factory.getContractArtifacts("Platform").codeHash}`,
  );

  await locklift.tracing.trace(
    proxyNative.methods
      .setTokenFeeCode({
        _code: locklift.factory.getContractArtifacts("BridgeTokenFee").code,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_TOKEN_FEE,
        bounce: true,
      }),
  );

  console.log(
    `Set token fee code to native proxy. Code hash: ${
      locklift.factory.getContractArtifacts("BridgeTokenFee").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods.setProxyMultiVaultNative({ _proxyMultiVaultNative: proxyNative.address }).send({
      from: admin.address,
      amount: config?.GAS.PROXY_MULTI_VAULT_SET_ONCE_EVM_TOKEN_PLATFORM,
      bounce: true,
    }),
  );

  console.log("Set native proxy to alien proxy");

  await locklift.tracing.trace(
    proxyNative.methods.setProxyMultiVaultAlien({ _proxyMultiVaultAlien: proxyAlien.address }).send({
      from: admin.address,
      amount: config?.GAS.PROXY_MULTI_VAULT_SET_ONCE_EVM_TOKEN_PLATFORM,
      bounce: true,
    }),
  );

  console.log("Set alien proxy to native proxy");
};

const deployStakingConfigurations = async (
  admin: Account,
  staking: Contract<RoundDeployerAbi>,
  ethEverEventConfigFactory: Contract<EthereumEverscaleEventConfigurationFactoryAbi>,
  everEthEventConfigFactory: Contract<EverscaleEthereumEventConfigurationFactoryAbi>,
): Promise<{
  stakingEthEverConfigs: Record<number, Contract<EthereumEverscaleEventConfigurationAbi>>;
  stakingEverEthConfig: Contract<EverscaleEthereumEventConfigurationAbi>;
}> => {
  const stakingEthEventAbi = {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint160", name: "eth_addr", type: "uint160" },
      { indexed: false, internalType: "int8", name: "workchain_id", type: "int8" },
      { indexed: false, internalType: "uint256", name: "addr_body", type: "uint256" },
    ],
    name: "RelayAddressVerified",
    type: "event",
  };

  const stakingEthEverConfigs: Record<number, Contract<EthereumEverscaleEventConfigurationAbi>> = {};

  for (const chainId of config.ETH_CHAIN_IDS) {
    const stakingEthEverConfiguration = {
      _owner: admin.address,
      _flags: 0,
      basicConfiguration: {
        eventABI: Buffer.from(JSON.stringify(stakingEthEventAbi)).toString("base64"),
        eventCode: locklift.factory.getContractArtifacts("StakingEthereumEverscaleEvent").code,
        staking: staking.address,
        eventInitialBalance: config?.GAS.ROUND_DEPLOYER_EVENT_INITIAL_BALANCE,
      },
      networkConfiguration: {
        chainId: chainId,
        eventEmitter: new BigNumber(config.ETH_STAKING_RELAY_VERIFIER.toLowerCase(), 16).toString(10),
        eventBlocksToConfirm: 30,
        proxy: staking.address,
        startBlockNumber: config.ETH_LAST_BLOCK[chainId],
        endBlockNumber: 0,
      },
    };

    await locklift.tracing.trace(
      ethEverEventConfigFactory.methods.deploy(stakingEthEverConfiguration).send({
        from: admin.address,
        amount: config?.GAS.DEPLOY_CONFIGURATION,
        bounce: true,
      }),
    );

    const stakingEthEverConfig = await ethEverEventConfigFactory.methods
      .deriveConfigurationAddress({
        basicConfiguration: stakingEthEverConfiguration.basicConfiguration,
        networkConfiguration: stakingEthEverConfiguration.networkConfiguration,
      })
      .call()
      .then(r => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

    stakingEthEverConfigs[chainId] = stakingEthEverConfig;

    await locklift.deployments.saveContract({
      contractName: "EthereumEverscaleEventConfiguration",
      address: stakingEthEverConfig.address,
      deploymentName: `RoundDeployerConfiguration-EthEverEvent-${chainId}`,
    });

    console.log(`EthereumEverscaleEventConfiguration (${chainId}): ${stakingEthEverConfig.address}`);
  }

  const stakingEverEventAbi = [
    { name: "round_num", type: "uint32" },
    { name: "eth_keys", type: "uint160[]" },
    { name: "round_end", type: "uint32" },
  ];

  const stakingEverEthConfiguration = {
    _owner: admin.address,
    _flags: 0,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(stakingEverEventAbi)).toString("base64"),
      eventCode: locklift.factory.getContractArtifacts("StakingEverscaleEthereumEvent").code,
      staking: staking.address,
      eventInitialBalance: config?.GAS.ROUND_DEPLOYER_EVENT_INITIAL_BALANCE,
    },
    networkConfiguration: {
      eventEmitter: staking.address,
      proxy: new BigNumber(config.ETH_STAKING_PROXY.toLowerCase(), 16).toString(10),
      startTimestamp: config.ETH_STAKING_START_TIMESTAMP,
      endTimestamp: 0,
    },
  };

  await locklift.tracing.trace(
    everEthEventConfigFactory.methods.deploy(stakingEverEthConfiguration).send({
      from: admin.address,
      amount: config?.GAS.DEPLOY_CONFIGURATION,
      bounce: true,
    }),
  );

  const stakingEverEthConfig = await everEthEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: stakingEverEthConfiguration.basicConfiguration,
      networkConfiguration: stakingEverEthConfiguration.networkConfiguration,
    })
    .call()
    .then(r => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

  await locklift.deployments.saveContract({
    contractName: "EverscaleEthereumEventConfiguration",
    address: stakingEverEthConfig.address,
    deploymentName: `RoundDeployerConfiguration-EverEthEvent`,
  });

  console.log(`EverscaleEthereumEventConfiguration: ${stakingEverEthConfig.address}`);

  return {
    stakingEthEverConfigs,
    stakingEverEthConfig,
  };
};

const deployConnectors = async (
  admin: Account,
  bridge: Contract<BridgeAbi>,
  configurations: Contract<
    EthereumEverscaleEventConfigurationAbi | EverscaleEthereumEventConfigurationAbi | TvmTvmEventConfigurationAbi
  >[],
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
  const signer = (await locklift.keystore.getSigner("0"))!;

  const [{ account: admin }] = await locklift.deployments.deployAccounts([
    {
      deploymentName: "Admin",
      signerId: "0",
      accountSettings: {
        type: WalletTypes.EverWallet,
        value: config?.GAS.DEPLOY_ADMIN,
      },
    },
  ]);

  console.log(`Bridge admin: ${admin.address}`);

  const { contract: roundDeployer } = await locklift.factory.deployContract({
    contract: "RoundDeployer",
    constructorParams: {
      _admin: admin.address,
      _bridge_event_config_ton_sol: zeroAddress,
      _bridge_event_config_ton_eth: zeroAddress,
    },
    initParams: { deploy_nonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_ROUND_DEPLOYER,
  });

  await locklift.deployments.saveContract({
    deploymentName: "RoundDeployer",
    address: roundDeployer.address,
    contractName: "RoundDeployer",
  });

  console.log(`RoundDeployer: ${roundDeployer.address}`);

  await setupRoundDeployerParams(roundDeployer, admin);

  const { contract: bridge } = await locklift.factory.deployContract({
    contract: "Bridge",
    initParams: { _randomNonce: getRandomNonce() },
    constructorParams: {
      _owner: admin.address,
      _staking: roundDeployer.address,
      _manager: admin.address,
      _connectorCode: locklift.factory.getContractArtifacts("Connector").code,
      _connectorDeployValue: config?.GAS.BRIDGE_CONNECTOR_DEPLOY_VALUE,
    },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_BRIDGE,
  });

  console.log(`Bridge: ${bridge.address}`);

  await locklift.deployments.saveContract({
    deploymentName: "Bridge",
    address: bridge.address,
    contractName: "Bridge",
  });

  const { ethEverEventConfigFactory, everEthEventConfigFactory } = await deployConfigFactories(signer);

  await deployMultiVaults(admin, signer);

  const { contract: cellEncoder } = await locklift.factory.deployContract({
    contract: "CellEncoderStandalone",
    constructorParams: {},
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_CELL_ENCODER_STANDALONE,
  });

  console.log(`CellEncoderStandalone: ${cellEncoder.address}`);

  await locklift.deployments.saveContract({
    deploymentName: "CellEncoderStandalone",
    address: cellEncoder.address,
    contractName: "CellEncoderStandalone",
  });

  const { stakingEthEverConfigs, stakingEverEthConfig } = await deployStakingConfigurations(
    admin,
    roundDeployer,
    ethEverEventConfigFactory,
    everEthEventConfigFactory,
  );

  await deployConnectors(admin, bridge, [...Object.values(stakingEthEverConfigs), stakingEverEthConfig] as never);

  await locklift.tracing.trace(
    roundDeployer.methods
      .setBridgeEventTonEthConfig({
        new_bridge_event_config_ton_eth: stakingEverEthConfig.address,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.ROUND_DEPLOYER_SET_BRIDGE_EVENT_TON_ETH_CONFIG,
        bounce: true,
      }),
  );

  console.log(`Set ton eth config to round deployer: ${stakingEverEthConfig.address}`);

  await locklift.tracing.trace(
    roundDeployer.methods
      .setActive({
        new_active: true,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: config?.GAS.ROUND_DEPLOYER_SET_ACTIVE,
        bounce: true,
      }),
  );

  console.log("Set round deployer active");
};

main().then(() => console.log("Success"));
