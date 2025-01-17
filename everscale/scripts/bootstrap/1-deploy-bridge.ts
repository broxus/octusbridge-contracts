import { Contract, getRandomNonce, Signer, toNano, WalletTypes, zeroAddress } from 'locklift';
import { Account } from 'everscale-standalone-client/nodejs';
import { BigNumber } from 'bignumber.js';

import {
  BridgeAbi,
  EthereumEverscaleEventConfigurationAbi,
  EthereumEverscaleEventConfigurationFactoryAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleEthereumEventConfigurationFactoryAbi,
  RoundDeployerAbi,
} from '../../build/factorySource';

const RELAYS_COUNT = 3;
const RELAY_ROUND_TIME = 60 * 60 * 24 * 30; // 1 month
// Time before the election after round starts
const TIME_BEFORE_SET_RELAYS = 60 * 60 * 24 * 4; // 4 days
// Min delta between next round start and current election end
const MIN_ROUND_GAP_TIME = 60; // 1 minute

const STAKING_CHAIN_ID = 56;
const ETH_STAKING_RELAY_VERIFIER = "0x1C132e9a529b93393c260b38d6DE53d96Cd4f78e";
const ETH_STAKING_START_BLOCK = 44581226;
const ETH_STAKING_PROXY = "0x6Ff70682DCff11A696e94e99d9cf60b1d78a72e5";
const ETH_STAKING_START_TIMESTAMP = 1733324541;

const setupStakingParams = async (staking: Contract<RoundDeployerAbi>, admin: Account): Promise<void> => {
  const platformArtifacts = locklift.factory.getContractArtifacts("Platform");

  await locklift.tracing.trace(
    staking.methods
      .installPlatformOnce({
        code: platformArtifacts.code,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: locklift.utils.toNano(11),
        bounce: true,
      }),
  );

  console.log(`Set platform code to staking. Code hash: ${platformArtifacts.codeHash}`);

  const relayRoundArtifacts = locklift.factory.getContractArtifacts("RelayRound");

  await locklift.tracing.trace(
    staking.methods
      .installOrUpdateRelayRoundCode({
        code: relayRoundArtifacts.code,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: locklift.utils.toNano(11),
        bounce: true,
      }),
  );

  console.log(`Set relay round code to staking. Code hash: ${relayRoundArtifacts.codeHash}`);

  await locklift.tracing.trace(
    staking.methods
      .setRelayConfig({
        new_relay_config: {
          minRelaysCount: RELAYS_COUNT,
          relayRoundTime: RELAY_ROUND_TIME,
          timeBeforeSetRelays: TIME_BEFORE_SET_RELAYS,
          minRoundGapTime: MIN_ROUND_GAP_TIME,
        },
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: locklift.utils.toNano(11),
        bounce: true,
      }),
  );

  console.log("Set relay config to staking");
};

const deployConfigFactories = async (signer: Signer): Promise<{
  ethEverEventConfigFactory: Contract<EthereumEverscaleEventConfigurationFactoryAbi>,
  everEthEventConfigFactory: Contract<EverscaleEthereumEventConfigurationFactoryAbi>,
}> => {
  const { contract: ethEverEventConfigFactory } = await locklift.factory.deployContract({
    contract: "EthereumEverscaleEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("EthereumEverscaleEventConfiguration").code,
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: toNano(1.5),
  });

  console.log(`EthEverEventConfigFactory: ${ethEverEventConfigFactory.address}`);

  const { contract: everEthEventConfigFactory } = await locklift.factory.deployContract({
    contract: "EverscaleEthereumEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("EverscaleEthereumEventConfiguration").code,
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: toNano(1.5),
  });

  console.log(`EverEthEventConfigFactory: ${everEthEventConfigFactory.address}`);

  return {
    ethEverEventConfigFactory,
    everEthEventConfigFactory,
  };
};

const deployMultiVaults = async (admin: Account, signer: Signer): Promise<void> => {
  const { contract: proxyAlien } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultAlien_V8",
    constructorParams: { owner_: admin.address },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(1.5),
  });

  console.log(`ProxyMultiVaultAlien: ${proxyAlien.address}`);

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergePoolPlatform({
        _mergePoolPlatform: locklift.factory.getContractArtifacts("MergePoolPlatform").code,
      })
      .send({
        from: admin.address,
        amount: toNano(0.5),
        bounce: true,
      })
  );

  console.log(`Set merge pool platform code to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("MergePoolPlatform").codeHash}`);

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergePool({
        _mergePool: locklift.factory.getContractArtifacts("MergePool_V5").code,
      })
      .send({
        from: admin.address,
        amount: toNano(0.5),
        bounce: true,
      })
  );

  console.log(`Set merge pool code to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("MergePool_V5").codeHash}`);

  await locklift.tracing.trace(
    proxyAlien.methods
      .setMergeRouter({
        _mergeRouter: locklift.factory.getContractArtifacts("MergeRouter").code,
      })
      .send({
        from: admin.address,
        amount: toNano(0.5),
        bounce: true,
      })
  );

  console.log(`Set merge router to alien proxy. Code hash: ${locklift.factory.getContractArtifacts("MergeRouter").codeHash}`);

  const { contract: proxyNative } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultNative_V6",
    constructorParams: { owner_: admin.address },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(1.5),
  });

  console.log(`ProxyMultiVaultNative: ${proxyNative.address}`);
};

const deployStakingConfigurations = async (
  admin: Account,
  staking: Contract<RoundDeployerAbi>,
  ethEverEventConfigFactory: Contract<EthereumEverscaleEventConfigurationFactoryAbi>,
  everEthEventConfigFactory: Contract<EverscaleEthereumEventConfigurationFactoryAbi>,
): Promise<{
  stakingEthEverConfig: Contract<EthereumEverscaleEventConfigurationAbi>,
  stakingEverEthConfig: Contract<EverscaleEthereumEventConfigurationAbi>,
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

  const stakingEthEverConfiguration = {
    _owner: admin.address,
    _flags: 0,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(stakingEthEventAbi)).toString("base64"),
      eventCode: locklift.factory.getContractArtifacts("StakingEthereumEverscaleEvent").code,
      staking: staking.address,
      eventInitialBalance: toNano(1),
    },
    networkConfiguration: {
      chainId: STAKING_CHAIN_ID,
      eventEmitter: new BigNumber(ETH_STAKING_RELAY_VERIFIER.toLowerCase(), 16).toString(10),
      eventBlocksToConfirm: 30,
      proxy: staking.address,
      startBlockNumber: ETH_STAKING_START_BLOCK,
      endBlockNumber: 0,
    },
  };

  await locklift.tracing.trace(
    ethEverEventConfigFactory.methods
      .deploy(stakingEthEverConfiguration)
      .send({
        from: admin.address,
        amount: toNano(2),
        bounce: true,
      }),
  );

  const stakingEthEverConfig = await ethEverEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: stakingEthEverConfiguration.basicConfiguration,
      networkConfiguration: stakingEthEverConfiguration.networkConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

  console.log(`EthereumEverscaleEventConfiguration: ${stakingEthEverConfig.address}`);

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
      eventInitialBalance: toNano(1),
    },
    networkConfiguration: {
      eventEmitter: staking.address,
      proxy: new BigNumber(ETH_STAKING_PROXY.toLowerCase(), 16).toString(10),
      startTimestamp: ETH_STAKING_START_TIMESTAMP,
      endTimestamp: 0,
    },
  };

  await locklift.tracing.trace(
    everEthEventConfigFactory.methods
      .deploy(stakingEverEthConfiguration)
      .send({
        from: admin.address,
        amount: toNano(2),
        bounce: true,
      }),
  );

  const stakingEverEthConfig = await everEthEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: stakingEverEthConfiguration.basicConfiguration,
      networkConfiguration: stakingEverEthConfiguration.networkConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

  console.log(`EverscaleEthereumEventConfiguration: ${stakingEverEthConfig.address}`);

  return {
    stakingEthEverConfig,
    stakingEverEthConfig,
  };
};

const deployConnectors = async (
  admin: Account,
  bridge: Contract<BridgeAbi>,
  configurations: Contract<EthereumEverscaleEventConfigurationAbi | EverscaleEthereumEventConfigurationAbi>[],
): Promise<void> => {
  for (const configuration of configurations) {
    const { traceTree: ttConnector } = await locklift.tracing.trace(
      bridge.methods
        .deployConnector({ _eventConfiguration: configuration.address })
        .send({
          from: admin.address,
          amount: toNano(2),
          bounce: true,
        }),
    );

    const connector = locklift.factory.getDeployedContract(
      "Connector",
      ttConnector!.findEventsForContract({ contract: bridge, name: "ConnectorDeployed" as const })[0].connector,
    );

    await locklift.tracing.trace(
      connector.methods
        .enable({})
        .send({
          from: admin.address,
          amount: toNano(0.5),
          bounce: true,
        }),
    );

    console.log(`${configuration.address} Connector: ${connector.address}`);
  }
};

const main = async (): Promise<void> => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const { account: admin } = await locklift.factory.accounts.addNewAccount({
    type: WalletTypes.EverWallet,
    publicKey: signer.publicKey,
    value: toNano(50),
  });

  console.log(`Bridge admin: ${admin.address}`);

  const { contract: bridgeToken } = await locklift.factory.deployContract({
    contract: 'TokenRoot',
    constructorParams: {
      initialSupplyTo: admin.address,
      initialSupply: 0,
      deployWalletValue: toNano(0.1),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: true,
      remainingGasTo: admin.address,
    },
    initParams: {
      name_: "Bridge Test Token",
      symbol_: "BRDG TEST",
      decimals_: 9,
      rootOwner_: admin.address,
      deployer_: zeroAddress,
      randomNonce_: getRandomNonce(),
      walletCode_: locklift.factory.getContractArtifacts("TokenWallet").code,
    },
    value: toNano(1.5),
    publicKey: await locklift.keystore.getSigner("0").then((s) => s!.publicKey)
  });

  console.log(`Bridge token: ${bridgeToken.address.toString()}`);

  const { contract: staking } = await locklift.factory.deployContract({
      contract: "RoundDeployer",
      constructorParams: {
        _admin: admin.address,
        _bridge_event_config_ton_sol: zeroAddress,
        _bridge_event_config_ton_eth: zeroAddress,
      },
      initParams: { deploy_nonce: getRandomNonce() },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(3),
  });

  console.log(`Staking: ${staking.address}`);

  await setupStakingParams(staking, admin);

  const { contract: bridge } = await locklift.factory.deployContract({
    contract: "Bridge",
    initParams: { _randomNonce: getRandomNonce() },
    constructorParams: {
      _owner: admin.address,
      _staking: staking.address,
      _manager: admin.address,
      _connectorCode: locklift.factory.getContractArtifacts("Connector").code,
      _connectorDeployValue: toNano(1),
    },
    publicKey: signer.publicKey,
    value: toNano(1.5),
  });

  console.log(`Bridge: ${bridge.address}`);

  const {
    ethEverEventConfigFactory,
    everEthEventConfigFactory,
  } = await deployConfigFactories(signer);

  await deployMultiVaults(admin, signer);

  const { contract: cellEncoder } = await locklift.factory.deployContract({
    contract: "CellEncoderStandalone",
    constructorParams: {},
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(1.5),
  });

  console.log(`CellEncoderStandalone: ${cellEncoder.address}`);

  const {
    stakingEthEverConfig,
    stakingEverEthConfig,
  } = await deployStakingConfigurations(
    admin,
    staking,
    ethEverEventConfigFactory,
    everEthEventConfigFactory,
  );

  await deployConnectors(admin, bridge, [stakingEthEverConfig, stakingEverEthConfig] as never);

  await locklift.tracing.trace(
    staking.methods
      .setBridgeEventTonEthConfig({
        new_bridge_event_config_ton_eth: stakingEverEthConfig.address,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: toNano(11),
        bounce: true
      }),
  );

  console.log(`Set ton eth config to staking: ${stakingEverEthConfig.address}`);

  await locklift.tracing.trace(
    staking.methods
      .setActive({
        new_active: true,
        send_gas_to: admin.address,
      })
      .send({
        from: admin.address,
        amount: locklift.utils.toNano(11),
        bounce: true,
      }),
  );

  console.log("Set staking active");
};

main().then(() => console.log("Success"));
