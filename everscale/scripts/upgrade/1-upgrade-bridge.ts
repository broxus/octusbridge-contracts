import {
  Address,
  Contract,
  getRandomNonce,
  Signer,
  toNano,
  zeroAddress,
} from 'locklift';

import {
  ProxyMultiVaultAlien_V10Abi,
  ProxyMultiVaultNative_V8Abi,
  EthereumEverscaleEventConfigurationFactoryAbi,
  EverscaleEthereumEventConfigurationFactoryAbi,
  TvmTvmEventConfigurationFactoryAbi,
  RoundDeployerAbi,
  MergePool_V7Abi,
} from '../../build/factorySource';

import assert from 'node:assert';
import { getConfig } from '../bootstrap/configs';

const config = getConfig();

assert(!!config, 'Config should be defined');

const EMPTY_CELL = 'te6ccgEBAQEAAgAAAA==';

const gasCoeff = 60;

const upgradeProxies = async (
  admin: Address,
): Promise<{
  alienProxy: Contract<ProxyMultiVaultAlien_V10Abi>;
  nativeProxy: Contract<ProxyMultiVaultNative_V8Abi>;
  needToUpgradeMergePool: boolean;
}> => {
  let needToUpgradeMergePool = false;

  let alienProxy =
    locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>(
      'ProxyMultiVaultAlien',
    );
  let nativeProxy =
    locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>(
      'ProxyMultiVaultNative',
    );

  const alienProxyCodeHash = await alienProxy
    .getFullState()
    .then((s) => s.state?.codeHash);
  const nativeProxyCodeHash = await nativeProxy
    .getFullState()
    .then((s) => s.state?.codeHash);

  assert(alienProxyCodeHash !== undefined, 'Alien proxy is not deployed');
  assert(nativeProxyCodeHash !== undefined, 'Native proxy is not deployed');

  const alienProxyNewCode = locklift.factory.getContractArtifacts(
    'ProxyMultiVaultAlien_V10',
  );
  const nativeProxyNewCode = locklift.factory.getContractArtifacts(
    'ProxyMultiVaultNative_V8',
  );

  if (alienProxyCodeHash !== alienProxyNewCode.codeHash) {
    console.log(
      `Updating alien proxy: ${alienProxyCodeHash} -> ${alienProxyNewCode.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .upgrade({ code: alienProxyNewCode.code })
        .send({ from: admin, amount: toNano(0.25 * gasCoeff), bounce: true }),
    );

    // Update abi in deployments and reload contract
    await locklift.deployments.saveContract({
      contractName: 'ProxyMultiVaultAlien_V10',
      address: alienProxy.address,
      deploymentName: 'ProxyMultiVaultAlien',
    });

    alienProxy =
      locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>(
        'ProxyMultiVaultAlien',
      );
  }

  if (nativeProxyCodeHash !== nativeProxyNewCode.codeHash) {
    console.log(
      `Updating native proxy: ${nativeProxyCodeHash} -> ${nativeProxyNewCode.codeHash}`,
    );

    await locklift.tracing.trace(
      nativeProxy.methods
        .upgrade({ code: nativeProxyNewCode.code })
        .send({ from: admin, amount: toNano(0.25 * gasCoeff), bounce: true }),
    );

    // Update abi in deployments and reload contract
    await locklift.deployments.saveContract({
      contractName: 'ProxyMultiVaultNative_V8',
      address: nativeProxy.address,
      deploymentName: 'ProxyMultiVaultNative',
    });

    nativeProxy =
      locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>(
        'ProxyMultiVaultNative',
      );
  }

  const { value2: alienTvmConfiguration } = await alienProxy.methods
    .getConfiguration({ answerId: 0 })
    .call({ responsible: true });

  if (alienTvmConfiguration.alienTokenRootCode === EMPTY_CELL) {
    const tvmAlienRoot = locklift.factory.getContractArtifacts('TokenRootAlienTVM');

    console.log(
      `Setting alien TVM root code to alien proxy: ${tvmAlienRoot.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setTVMAlienTokenRootCode({
          _tokenRootCode: tvmAlienRoot.code,
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  if (alienTvmConfiguration.alienTokenWalletCode === EMPTY_CELL) {
    const tvmAlienWallet = locklift.factory.getContractArtifacts('AlienTokenWalletUpgradeable');

    console.log(
      `Setting alien TVM wallet code to alien proxy: ${tvmAlienWallet.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setTVMAlienTokenWalletCode({
          _tokenWalletCode: tvmAlienWallet.code,
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  if (alienTvmConfiguration.alienTokenWalletPlatformCode === EMPTY_CELL) {
    const tvmAlienPlatform = locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');

    console.log(
      `Setting alien TVM platform code to alien proxy: ${tvmAlienPlatform.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setOnceTVMAlienTokenPlatformCode({
          _tokenPlatformCode: tvmAlienPlatform.code,
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const alienTokenFeeCodeHash = await locklift.provider.getBocHash(
    alienTvmConfiguration.tokenFeeCode,
  );

  const newTokenFeeCode =
    locklift.factory.getContractArtifacts('BridgeTokenFee');

  if (alienTokenFeeCodeHash !== newTokenFeeCode.codeHash) {
    console.log(
      `Setting token fee code to alien proxy: ${alienTokenFeeCodeHash} -> ${newTokenFeeCode.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setTokenFeeCode({ _code: newTokenFeeCode.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const alienTokenFeePlatform = await alienProxy.methods
    .getPlatformCode({ answerId: 0 })
    .call({ responsible: true })
    .then((r) => r.value0);

  const newTokenFeePlatform =
    locklift.factory.getContractArtifacts('TokenFeePlatform');

  if (alienTokenFeePlatform === EMPTY_CELL) {
    console.log(
      `Setting token fee platform code to alien proxy: ${newTokenFeePlatform.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setPlatformCode({ _code: newTokenFeePlatform.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const mergePoolCodeHash = await alienProxy.methods
    .mergePool()
    .call()
    .then((r) => locklift.provider.getBocHash(r.mergePool));

  const newMergePoolCode =
    locklift.factory.getContractArtifacts('MergePool_V7');

  if (mergePoolCodeHash !== newMergePoolCode.codeHash) {
    console.log(
      `Setting merge pool code to alien proxy: ${mergePoolCodeHash} -> ${newMergePoolCode.codeHash}`,
    );

    // Flag to upgrade all merge pools
    needToUpgradeMergePool = true;

    await locklift.tracing.trace(
      alienProxy.methods
        .setMergePool({ _mergePool: newMergePoolCode.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const mergeRouterCodeHash = await alienProxy.methods
    .mergeRouter()
    .call()
    .then((r) => locklift.provider.getBocHash(r.mergeRouter));

  const newMergeRouterCode =
    locklift.factory.getContractArtifacts('MergeRouter');

  if (mergeRouterCodeHash !== newMergeRouterCode.codeHash) {
    console.log(
      `Setting merge router code to alien proxy: ${mergeRouterCodeHash} -> ${newMergeRouterCode.codeHash}`,
    );

    await locklift.tracing.trace(
      alienProxy.methods
        .setMergeRouter({ _mergeRouter: newMergeRouterCode.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const nativeProxyInAlien = await alienProxy.methods
    .proxyMultiVaultNative()
    .call()
    .then((r) => r.proxyMultiVaultNative);

  if (nativeProxyInAlien.equals(zeroAddress)) {
    console.log(`Setting native proxy address to alien proxy`);

    await locklift.tracing.trace(
      alienProxy.methods
        .setProxyMultiVaultNative({
          _proxyMultiVaultNative: nativeProxy.address,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const limitApproverInAlien = await alienProxy.methods
    .getLimitApprover({ answerId: 0 })
    .call()
    .then((r) => r.value0);

  if (limitApproverInAlien.equals(zeroAddress)) {
    console.log(`Setting limit approver address to alien proxy`);

    await locklift.tracing.trace(
      alienProxy.methods
        .setLimitApprover({
          _approver: new Address(config.LIMIT_APPROVER),
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const { value2: nativeTvmConfiguration } = await nativeProxy.methods
    .getConfiguration({ answerId: 0 })
    .call({ responsible: true });

  const nativeTokenFeeCodeHash = await locklift.provider.getBocHash(
    nativeTvmConfiguration.tokenFeeCode,
  );

  if (nativeTokenFeeCodeHash !== newTokenFeeCode.codeHash) {
    console.log(
      `Setting token fee code to native proxy: ${nativeTokenFeeCodeHash} -> ${newTokenFeeCode.codeHash}`,
    );

    await locklift.tracing.trace(
      nativeProxy.methods
        .setTokenFeeCode({ _code: newTokenFeeCode.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const nativeTokenFeePlatform = await nativeProxy.methods
    .getPlatformCode({ answerId: 0 })
    .call({ responsible: true })
    .then((r) => r.value0);

  if (nativeTokenFeePlatform === EMPTY_CELL) {
    console.log(
      `Setting token fee platform code to native proxy: ${newTokenFeePlatform.codeHash}`,
    );

    await locklift.tracing.trace(
      nativeProxy.methods
        .setPlatformCode({ _code: newTokenFeePlatform.code })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const nativeEventAddressKeeperCodeHash = await locklift.provider.getBocHash(
    nativeTvmConfiguration.eventAddressKeeperCode,
  );

  const newEventAddressKeeperCode =
    locklift.factory.getContractArtifacts('EventAddressKeeper');

  if (nativeEventAddressKeeperCodeHash !== newEventAddressKeeperCode.codeHash) {
    console.log(
      `Setting event address keeper code to native proxy: ${nativeEventAddressKeeperCodeHash} -> ${newEventAddressKeeperCode.codeHash}`,
    );

    await locklift.tracing.trace(
      nativeProxy.methods
        .setTVMEventAddressKeeperCode({
          _eventAddressKeeperCode: newEventAddressKeeperCode.code,
          remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const alienProxyInNative = await nativeProxy.methods
    .proxyMultiVaultAlien()
    .call()
    .then((r) => r.proxyMultiVaultAlien);

  if (alienProxyInNative.equals(zeroAddress)) {
    console.log(`Setting alien proxy address to native proxy`);

    await locklift.tracing.trace(
      nativeProxy.methods
        .setProxyMultiVaultAlien({ _proxyMultiVaultAlien: alienProxy.address })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const coldVaultInNative = await nativeProxy.methods
    .coldVault()
    .call()
    .then((r) => r.coldVault);

  if (coldVaultInNative.equals(zeroAddress)) {
    console.log(`Setting cold vault address to native proxy`);

    await locklift.tracing.trace(
      nativeProxy.methods
        .setColdVault({
          _coldVault: new Address(config.COLD_VAULT),
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const vaultWithdrawerInNative = await nativeProxy.methods
    .vaultWithdrawer()
    .call()
    .then((r) => r.vaultWithdrawer);

  if (vaultWithdrawerInNative.equals(zeroAddress)) {
    console.log(`Setting vault withdrawer address to native proxy`);

    await locklift.tracing.trace(
      nativeProxy.methods
        .setVaultWithdrawer({
          _withdrawer: new Address(config.WITHDRAWER),
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  const limitApproverInNative = await nativeProxy.methods
    .getLimitApprover({ answerId: 0 })
    .call()
    .then((r) => r.value0);

  if (limitApproverInNative.equals(zeroAddress)) {
    console.log(`Setting limit approver address to native proxy`);

    await locklift.tracing.trace(
      nativeProxy.methods
        .setLimitApprover({
          _approver: new Address(config.LIMIT_APPROVER),
          _remainingGasTo: admin,
        })
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }

  return {
    alienProxy,
    nativeProxy,
    needToUpgradeMergePool,
  };
};

const upgradeMergePools = async (
  admin: Address,
  alienProxy: Contract<ProxyMultiVaultAlien_V10Abi>,
): Promise<void> => {
  const mergePools = Object.entries(
    locklift.deployments.deploymentsStore,
  ).filter(([name]) => name.startsWith('MergePool-')) as [
    string,
    Contract<MergePool_V7Abi>,
  ][];

  for (const [name, pool] of mergePools) {
    console.log(`Upgrade MergePool: ${name}`);

    await locklift.tracing.trace(
      alienProxy.methods
        .upgradeMergePool({ pool: pool.address })
        .send({ from: admin, amount: toNano(0.5 * gasCoeff), bounce: true }),
    );

    await locklift.deployments.saveContract({
      contractName: 'MergePool_V7',
      address: pool.address,
      deploymentName: name,
    });

    await locklift.tracing.trace(
      pool.methods
        .enableAll({})
        .send({ from: admin, amount: toNano(0.2 * gasCoeff), bounce: true }),
    );
  }
};

const upgradeConfigFactories = async (signer: Signer): Promise<void> => {
  let oldEvmTvmEventConfigFactory = null;

  try {
    oldEvmTvmEventConfigFactory =
      locklift.deployments.getContract<EthereumEverscaleEventConfigurationFactoryAbi>(
        'EvmTvmEventConfigFactory',
      );
  } catch (e) {
    console.log('EvmTvmEventConfigFactory is not deployed');
  }

  const oldEvmTvmEventConfigFactoryCodeHash = await oldEvmTvmEventConfigFactory
    ?.getFullState()
    .then((r) => r.state?.codeHash);
  const newEvmTvmEventConfigFactory = locklift.factory.getContractArtifacts(
    'EthereumEverscaleEventConfigurationFactory',
  );
  const oldEvmTvmConfigurationCodeHash =
    await oldEvmTvmEventConfigFactory?.methods
      .configurationCode()
      .call()
      .then((r) => locklift.provider.getBocHash(r.configurationCode));
  const newEvmTvmConfigurationCode = locklift.factory.getContractArtifacts(
    'EthereumEverscaleEventConfiguration',
  );

  if (
    !oldEvmTvmEventConfigFactory ||
    newEvmTvmConfigurationCode.codeHash !== oldEvmTvmConfigurationCodeHash ||
    newEvmTvmEventConfigFactory.codeHash !== oldEvmTvmEventConfigFactoryCodeHash
  ) {
    const { contract: evmTvmEventConfigFactory } =
      await locklift.factory.deployContract({
        contract: 'EthereumEverscaleEventConfigurationFactory',
        constructorParams: {
          _configurationCode: newEvmTvmConfigurationCode.code,
        },
        initParams: { _randomNonce: getRandomNonce() },
        publicKey: signer.publicKey,
        value: toNano(1 * gasCoeff),
      });

    await locklift.deployments.saveContract({
      contractName: 'EthereumEverscaleEventConfigurationFactory',
      address: evmTvmEventConfigFactory.address,
      deploymentName: 'EvmTvmEventConfigFactory',
    });

    console.log(
      `EvmTvmEventConfigFactory: ${evmTvmEventConfigFactory.address.toString()}`,
    );
  }

  let oldTvmEvmEventConfigFactory = null;

  try {
    oldTvmEvmEventConfigFactory =
      locklift.deployments.getContract<EverscaleEthereumEventConfigurationFactoryAbi>(
        'TvmEvmEventConfigFactory',
      );
  } catch (e) {
    console.log('TvmEvmEventConfigFactory is not deployed');
  }

  const oldTvmEvmEventConfigFactoryCodeHash = await oldTvmEvmEventConfigFactory
    ?.getFullState()
    .then((r) => r.state?.codeHash);
  const newTvmEvmEventConfigFactory = locklift.factory.getContractArtifacts(
    'EverscaleEthereumEventConfigurationFactory',
  );
  const oldTvmEvmConfigurationCodeHash =
    await oldTvmEvmEventConfigFactory?.methods
      .configurationCode()
      .call()
      .then((r) => locklift.provider.getBocHash(r.configurationCode));
  const newTvmEvmConfigurationCode = locklift.factory.getContractArtifacts(
    'EverscaleEthereumEventConfiguration',
  );

  if (
    !oldTvmEvmEventConfigFactory ||
    newTvmEvmConfigurationCode.codeHash !== oldTvmEvmConfigurationCodeHash ||
    newTvmEvmEventConfigFactory.codeHash !== oldTvmEvmEventConfigFactoryCodeHash
  ) {
    const { contract: tvmEvmEventConfigFactory } =
      await locklift.factory.deployContract({
        contract: 'EverscaleEthereumEventConfigurationFactory',
        constructorParams: {
          _configurationCode: newTvmEvmConfigurationCode.code,
        },
        initParams: { _randomNonce: getRandomNonce() },
        publicKey: signer.publicKey,
        value: toNano(1 * gasCoeff),
      });

    await locklift.deployments.saveContract({
      contractName: 'EverscaleEthereumEventConfigurationFactory',
      address: tvmEvmEventConfigFactory.address,
      deploymentName: 'TvmEvmEventConfigFactory',
    });

    console.log(
      `TvmEvmEventConfigFactory: ${tvmEvmEventConfigFactory.address.toString()}`,
    );
  }

  let oldTvmTvmEventConfigFactory = null;

  try {
    oldTvmTvmEventConfigFactory =
      locklift.deployments.getContract<TvmTvmEventConfigurationFactoryAbi>(
        'TvmTvmEventConfigFactory',
      );
  } catch (e) {
    console.log('TvmTvmEventConfigFactory is not deployed');
  }

  const oldTvmTvmEventConfigFactoryCodeHash = await oldTvmTvmEventConfigFactory
    ?.getFullState()
    .then((r) => r.state?.codeHash);
  const newTvmTvmEventConfigFactory = locklift.factory.getContractArtifacts(
    'TvmTvmEventConfigurationFactory',
  );
  const oldTvmTvmConfigurationCodeHash =
    await oldTvmTvmEventConfigFactory?.methods
      .configurationCode()
      .call()
      .then((r) => locklift.provider.getBocHash(r.configurationCode));
  const newTvmTvmConfigurationCode = locklift.factory.getContractArtifacts(
    'TvmTvmEventConfiguration',
  );

  if (
    !oldTvmTvmEventConfigFactory ||
    newTvmTvmConfigurationCode.codeHash !== oldTvmTvmConfigurationCodeHash ||
    newTvmTvmEventConfigFactory.codeHash !== oldTvmTvmEventConfigFactoryCodeHash
  ) {
    const { contract: tvmTvmEventConfigFactory } =
      await locklift.factory.deployContract({
        contract: 'TvmTvmEventConfigurationFactory',
        constructorParams: {
          _configurationCode: newTvmTvmConfigurationCode.code,
        },
        initParams: { _randomNonce: getRandomNonce() },
        publicKey: signer.publicKey,
        value: toNano(1 * gasCoeff),
      });

    await locklift.deployments.saveContract({
      contractName: 'TvmTvmEventConfigurationFactory',
      address: tvmTvmEventConfigFactory.address,
      deploymentName: 'TvmTvmEventConfigFactory',
    });

    console.log(
      `TvmTvmEventConfigFactory: ${tvmTvmEventConfigFactory.address.toString()}`,
    );
  }
};

const upgradeRoundDeployer = async (admin: Address) => {
  let roundDeployer =
    locklift.deployments.getContract<RoundDeployerAbi>('RoundDeployer');

  const roundDeployerCodeHash = await roundDeployer
    .getFullState()
    .then((s) => s.state?.codeHash);

  assert(roundDeployerCodeHash !== undefined, 'Round deployer is not deployed');

  const roundDeployerNewCode =
    locklift.factory.getContractArtifacts('RoundDeployer');

  if (roundDeployerCodeHash !== roundDeployerNewCode.codeHash) {
    console.log(
      `Updating round deployer: ${roundDeployerCodeHash} -> ${roundDeployerNewCode.codeHash}`,
    );

    await locklift.tracing.trace(
      roundDeployer.methods
        .upgrade({ code: roundDeployerNewCode.code, send_gas_to: admin })
        .send({ from: admin, amount: toNano(3 * gasCoeff), bounce: true }),
    );

    // Update abi in deployments and reload contract
    await locklift.deployments.saveContract({
      contractName: 'RoundDeployer',
      address: roundDeployer.address,
      deploymentName: 'RoundDeployer',
    });

    roundDeployer =
      locklift.deployments.getContract<RoundDeployerAbi>('RoundDeployer');
  }

  const relayRoundCodeHash = await roundDeployer.methods
    .getCodeData({ answerId: 0 })
    .call({ responsible: true })
    .then((r) => locklift.provider.getBocHash(r.value0.relay_round_code));

  const newRelayRoundCode = locklift.factory.getContractArtifacts('RelayRound');

  if (relayRoundCodeHash !== newRelayRoundCode.codeHash) {
    console.log(
      `Setting relay round code to round deployer: ${relayRoundCodeHash} -> ${newRelayRoundCode.codeHash}`,
    );

    await locklift.tracing.trace(
      roundDeployer.methods
        .installOrUpdateRelayRoundCode({
          code: newRelayRoundCode.code,
          send_gas_to: admin,
        })
        .send({ from: admin, amount: toNano(2 * gasCoeff), bounce: true }),
    );
  }
};

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount('Admin');

  const { alienProxy, needToUpgradeMergePool } = await upgradeProxies(
    admin.account.address,
  );

  if (needToUpgradeMergePool) {
    await upgradeMergePools(admin.account.address, alienProxy);
  }

  await upgradeConfigFactories(admin.signer);
  await upgradeRoundDeployer(admin.account.address);
};

main()
  .then(() => {
    console.log('Success');
  })
  .catch((err: unknown) => {
    console.error(err);
  });
