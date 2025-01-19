import { Address, Contract, toNano, WalletTypes } from 'locklift';
import { BigNumber } from 'bignumber.js';
import { Account } from 'everscale-standalone-client/nodejs';
import { BridgeAbi, MultiVaultEVMEverscaleEventAlienAbi, MultiVaultEverscaleEVMEventAlienAbi } from '../../build/factorySource';

const BRIDGE_ADMIN = "0:2746d46337aa25d790c97f1aefb01a5de48cc1315b41a4f32753146a1e1aeb7d";
const BRIDGE = "0:16c43aee96a19ad89066d4e8ec3929c202006499f54c5ad63627a0dadca91b11";
const STAKING = "0:90ffc3c1293cadf3e7150209c30cc6233b56744fd5c00598a8aaad0e335754d2";
const ETH_EVER_EVENT_CONFIG_FACTORY = "0:6e23265a695e48a26c9bdcad8fb83fb6abff8ab16ec78997b175f88422374999";
const EVER_ETH_EVER_EVENT_CONFIG_FACTORY = "0:b73473bf5c710c0b72d70840e6d8e8950367dc6952c1ff8fb97de3318269f685";
const PROXY_MULTI_VAULT_ALIEN = "0:3d2ee3ff7118b05c7ea39ff6cdefe8101814bc3753ca45654d76b6791611992a";
const PROXY_MULTI_VAULT_NATIVE = "0:abaef59990f979b2f42bfb3ebd85bbe4a9841dc1b489a9dbb3cd73244b95fee8";

const CHAIN_ID = 56;
const START_BLOCK_NUMBER = 44581229;
const BLOCKS_TO_CONFIRM = 30;
const START_TIMESTAMP = Math.floor(Date.now() / 1000);
const MULTI_VAULT_PROXY = "0x6Ff70682DCff11A696e94e99d9cf60b1d78a72e5";

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
    { indexed: false, internalType: "bytes", name: "payload", type: "bytes" }
  ],
  name: "AlienTransfer",
  type: "event"
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
    { indexed: false, internalType: "bytes", name: "payload", type: "bytes" }
  ],
  name: "NativeTransfer",
  type: "event"
};

const EVER_ALIEN_TRANSFER_EVENT_ABI = [
  { name: "token", type: "uint160" },
  { name: "amount", type: "uint128" },
  { name: "recipient", type: "uint160" },
  { name: "chainId", type: "uint256" },
  { name: "callback_recipient", type: "uint160" },
  { name: "callback_payload", type: "bytes" },
  { name: "callback_strict", type: "bool" }
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
  { name: "callback_strict", type: "bool" }
];

const deployConnectors = async (
  admin: Account,
  bridge: Contract<BridgeAbi>,
  configurations: Contract<MultiVaultEVMEverscaleEventAlienAbi | MultiVaultEverscaleEVMEventAlienAbi>[],
): Promise<void> => {
  for (const configuration of configurations) {
    const { traceTree: ttConnector } = await locklift.tracing.trace(
      bridge.methods
        .deployConnector({ _eventConfiguration: configuration.address })
        .send({
          from: admin.address,
          amount: toNano(120),
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
          amount: toNano(30),
          bounce: true,
        }),
    );

    console.log(`${configuration.address} Connector: ${connector.address}`);
  }
};

const main = async (): Promise<void> => {
  const admin = await locklift.factory.accounts.addExistingAccount({
    type: WalletTypes.EverWallet,
    address: new Address(BRIDGE_ADMIN),
  });

  const ethEverEventConfigFactory = locklift.factory.getDeployedContract(
    "EthereumEverscaleEventConfigurationFactory",
    new Address(ETH_EVER_EVENT_CONFIG_FACTORY),
  );
  const everEthEventConfigFactory = locklift.factory.getDeployedContract(
    "EverscaleEthereumEventConfigurationFactory",
    new Address(EVER_ETH_EVER_EVENT_CONFIG_FACTORY),
  );
  const proxyMultiVaultAlien = locklift.factory.getDeployedContract(
    "ProxyMultiVaultAlien_V8",
    new Address(PROXY_MULTI_VAULT_ALIEN),
  );
  const proxyMultiVaultNative = locklift.factory.getDeployedContract(
    "ProxyMultiVaultNative_V6",
    new Address(PROXY_MULTI_VAULT_NATIVE),
  );

  const ethEverAlienConfiguration = {
    _owner: admin.address,
    _flags: 2,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(ALIEN_TRANSFER_EVENT_ABI)).toString("base64"),
      staking: new Address(STAKING),
      eventInitialBalance: toNano(6),
      eventCode: locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventAlien").code,
    },
    networkConfiguration: {
      chainId: CHAIN_ID,
      eventEmitter: new BigNumber(MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
      eventBlocksToConfirm: BLOCKS_TO_CONFIRM,
      proxy: proxyMultiVaultAlien.address,
      startBlockNumber: START_BLOCK_NUMBER,
      endBlockNumber: 0,
    },
  };

  await locklift.tracing.trace(
    ethEverEventConfigFactory.methods
      .deploy(ethEverAlienConfiguration)
      .send({
        from: admin.address,
        amount: toNano(120),
        bounce: true,
      }),
  );

  const ethEverAlienConfig = await ethEverEventConfigFactory.methods
    .deriveConfigurationAddress({
      networkConfiguration: ethEverAlienConfiguration.networkConfiguration,
      basicConfiguration: ethEverAlienConfiguration.basicConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

  console.log(`EthEverAlienEventConfig: ${ethEverAlienConfig.address}`);

  const ethEverNativeConfiguration = {
    _owner: admin.address,
    _flags: 10,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(NATIVE_TRANSFER_EVENT_ABI)).toString("base64"),
      staking: new Address(STAKING),
      eventInitialBalance: toNano(6),
      eventCode: locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventNative").code,
    },
    networkConfiguration: {
      chainId: CHAIN_ID,
      eventEmitter: new BigNumber(MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
      eventBlocksToConfirm: BLOCKS_TO_CONFIRM,
      proxy: proxyMultiVaultNative.address,
      startBlockNumber: START_BLOCK_NUMBER,
      endBlockNumber: 0,
    },
  };

  await locklift.tracing.trace(
    ethEverEventConfigFactory.methods
      .deploy(ethEverNativeConfiguration)
      .send({
        from: admin.address,
        amount: toNano(120),
        bounce: true,
      }),
  );

  const ethEverNativeConfig = await ethEverEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: ethEverNativeConfiguration.basicConfiguration,
      networkConfiguration: ethEverNativeConfiguration.networkConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", r.value0));

  console.log(`EthEverNativeEventConfig: ${ethEverNativeConfig.address}`);

  const everEthAlienConfiguration = {
    _owner: admin.address,
    _flags: 0,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(EVER_ALIEN_TRANSFER_EVENT_ABI)).toString("base64"),
      staking: new Address(STAKING),
      eventInitialBalance: toNano(6),
      eventCode: locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventAlien").code,
    },
    networkConfiguration: {
      eventEmitter: proxyMultiVaultAlien.address,
      proxy: new BigNumber(MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
      startTimestamp: START_TIMESTAMP,
      endTimestamp: 0,
    },
  };

  await locklift.tracing.trace(
    everEthEventConfigFactory.methods
      .deploy(everEthAlienConfiguration)
      .send({
        from: admin.address,
        amount: toNano(120),
        bounce: true,
      }),
  );

  const everEthAlienConfig = await everEthEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: everEthAlienConfiguration.basicConfiguration,
      networkConfiguration: everEthAlienConfiguration.networkConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

  console.log(`EverEthAlienEventConfig: ${everEthAlienConfig.address}`);

  const everEthNativeConfiguration = {
    _owner: admin.address,
    _flags: 1,
    basicConfiguration: {
      eventABI: Buffer.from(JSON.stringify(EVER_NATIVE_TRANSFER_EVENT_ABI)).toString("base64"),
      staking: new Address(STAKING),
      eventInitialBalance: toNano(6),
      eventCode: locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventNative").code,
    },
    networkConfiguration: {
      eventEmitter: proxyMultiVaultNative.address,
      proxy: new BigNumber(MULTI_VAULT_PROXY.toLowerCase(), 16).toString(10),
      startTimestamp: START_TIMESTAMP,
      endTimestamp: 0,
    },
  };

  await locklift.tracing.trace(
    everEthEventConfigFactory.methods
      .deploy(everEthNativeConfiguration)
      .send({
        from: admin.address,
        amount: toNano(120),
        bounce: true,
      }),
  );

  const everEthNativeConfig = await everEthEventConfigFactory.methods
    .deriveConfigurationAddress({
      basicConfiguration: everEthNativeConfiguration.basicConfiguration,
      networkConfiguration: everEthNativeConfiguration.networkConfiguration,
    })
    .call()
    .then((r) => locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", r.value0));

  console.log(`EverEthNativeEventConfig: ${everEthNativeConfig.address}`);

  await deployConnectors(
    admin,
    locklift.factory.getDeployedContract("Bridge", new Address(BRIDGE)),
    [ethEverAlienConfig, ethEverNativeConfig, everEthAlienConfig, everEthNativeConfig] as never[],
  );

  const tokenWalletCode = locklift.factory.getContractArtifacts('AlienTokenWalletUpgradeable').code;
  const tokenPlatformCode = locklift.factory.getContractArtifacts('AlienTokenWalletPlatform').code;
  const tokenRootCode = locklift.factory.getContractArtifacts('TokenRootAlienEVM').code;

  await locklift.tracing.trace(
    proxyMultiVaultAlien.methods
      .setEVMConfiguration({
        _config: {
          everscaleConfiguration: everEthAlienConfig.address,
          evmConfigurations: [ethEverAlienConfig.address],
          alienTokenWalletPlatformCode: tokenPlatformCode,
          alienTokenRootCode: tokenRootCode,
          alienTokenWalletCode: tokenWalletCode,
        },
        remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: toNano(30),
        bounce: true,
      })
  );

  await locklift.tracing.trace(
    proxyMultiVaultNative.methods
      .setEVMConfiguration({
        _config: {
          everscaleConfiguration: everEthNativeConfig.address,
          evmConfigurations: [ethEverNativeConfig.address],
        },
        remainingGasTo: admin.address,
      })
      .send({
        from: admin.address,
        amount: toNano(30),
        bounce: true,
      })
  );
};

main().then(() => console.log("Success"));
