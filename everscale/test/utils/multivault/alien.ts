import { Account } from "everscale-standalone-client/nodejs";
import { Address, Contract, zeroAddress } from "locklift";
import {
  BridgeTokenFeeAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  FactorySource,
  ProxyMultiVaultAlien_V9Abi,
  SolanaEverscaleEventConfigurationAbi,
  TokenWalletAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
} from "../../../build/factorySource";
import { logContract } from "../logger";
import {
  setupEthereumEverscaleEventConfiguration,
  setupEverscaleEthereumEventConfiguration,
} from "../event-configurations/evm";
import {
  setupEverscaleSolanaEventConfiguration,
  setupSolanaEverscaleEventConfiguration,
} from "../event-configurations/solana";
import { setupTvmTvmEventConfiguration } from "../event-configurations/tvm";

export const setupAlienMultiVault = async (
  owner: Account,
  staking: Contract<FactorySource["StakingMockup"]>,
  trustlessVerifier?: Contract<TrustlessVerifierMockupAbi>,
): Promise<
  [
    Contract<EthereumEverscaleEventConfigurationAbi>,
    Contract<EverscaleEthereumEventConfigurationAbi>,
    Contract<SolanaEverscaleEventConfigurationAbi>,
    Contract<EverscaleSolanaEventConfigurationAbi>,
    Contract<ProxyMultiVaultAlien_V9Abi>,
    Contract<TvmTvmEventConfigurationAbi>,
  ]
> => {
  const _randomNonce = locklift.utils.getRandomNonce();
  const signer = (await locklift.keystore.getSigner("2"))!;

  // Deploy proxy
  const { contract: proxy } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultAlien_V9",
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(15),
  });

  await logContract("ProxyMultiVaultAlien_V9", proxy.address);

  // Load event contracts
  const ethereumEverscaleEvent = locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventAlien");
  const everscaleEthereumEvent = locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventAlien");
  const solanaEverscaleEvent = locklift.factory.getContractArtifacts("MultiVaultSolanaEverscaleEventAlien");
  const everscaleSolanaEvent = locklift.factory.getContractArtifacts("MultiVaultEverscaleSolanaEventAlien");
  const tvmEverscaleEvent = locklift.factory.getContractArtifacts("MultiVaultTvmTvmEventAlien");

  // Deploy configurations
  const ethereumEverscaleEventConfiguration = await setupEthereumEverscaleEventConfiguration(
    owner,
    staking,
    proxy.address,
    ethereumEverscaleEvent.code,
  );
  const everscaleEthereumEventConfiguration = await setupEverscaleEthereumEventConfiguration(
    owner,
    staking,
    proxy.address,
    everscaleEthereumEvent.code,
  );
  const solanaEverscaleEventConfiguration = await setupSolanaEverscaleEventConfiguration(
    owner,
    staking,
    proxy.address,
    solanaEverscaleEvent.code,
  );
  const everscaleSolanaEventConfiguration = await setupEverscaleSolanaEventConfiguration(
    owner,
    staking,
    proxy.address,
    everscaleSolanaEvent.code,
  );
  const tvmTvmEventConfiguration = await setupTvmTvmEventConfiguration(
    owner,
    proxy.address,
    tvmEverscaleEvent.code,
    trustlessVerifier?.address || zeroAddress,
    new Address("0:e5a27c4483793c43db13ad995df317c7dd29b6d6d95d8bcf77bfcd531c25cd8a")
  );

  // Set proxy EVM configuration
  await setEvmConfiguration(proxy, owner, everscaleEthereumEventConfiguration, [ethereumEverscaleEventConfiguration]);

  // Set proxy Solana configuration
  await setSolanaConfiguration(proxy, owner, everscaleSolanaEventConfiguration, solanaEverscaleEventConfiguration);

  // Set proxy TVM configuration
  await setTVMConfiguration(proxy, owner, [tvmTvmEventConfiguration]);

  // Set merging
  const MergeRouter = locklift.factory.getContractArtifacts("MergeRouter");
  const MergePool = locklift.factory.getContractArtifacts("MergePool_V6");
  const MergePoolPlatform = locklift.factory.getContractArtifacts("MergePoolPlatform");

  await proxy.methods
    .setMergeRouter({
      _mergeRouter: MergeRouter.code,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(1),
    });

  await proxy.methods
    .setMergePool({
      _mergePool: MergePool.code,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(1),
    });

  await proxy.methods
    .setMergePoolPlatform({
      _mergePoolPlatform: MergePoolPlatform.code,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(1),
    });

  // set BridgeTokenFee and Platform code
  await setCode(proxy, owner);

  return [
    ethereumEverscaleEventConfiguration,
    everscaleEthereumEventConfiguration,
    solanaEverscaleEventConfiguration,
    everscaleSolanaEventConfiguration,
    proxy,
    tvmTvmEventConfiguration,
  ];
};

const setEvmConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V9Abi>,
  owner: Account,
  everscaleConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>,
  evmConfigurations: Contract<EthereumEverscaleEventConfigurationAbi>[],
): Promise<void> => {
  const alienTokenRootEVM = locklift.factory.getContractArtifacts("TokenRootAlienEVM");
  const alienTokenWalletUpgradeableData = locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
  const alienTokenWalletPlatformData = locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setEVMConfiguration({
        _everscaleConfiguration: everscaleConfiguration.address,
        _evmConfigurations: evmConfigurations.map(e => e.address),
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setEVMAlienTokenRootCode({
        _tokenRootCode: alienTokenRootEVM.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setEVMAlienTokenWalletCode({
        _tokenWalletCode: alienTokenWalletUpgradeableData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setOnceEVMAlienTokenPlatformCode({
        _tokenPlatformCode: alienTokenWalletPlatformData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );
};

const setSolanaConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V9Abi>,
  owner: Account,
  everscaleConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>,
  solanaConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>,
): Promise<void> => {
  const alienTokenRootSolana = locklift.factory.getContractArtifacts("TokenRootAlienSolana");
  const alienTokenWalletUpgradeableData = locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
  const alienTokenWalletPlatformData = locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setSolanaConfiguration({
        _everscaleConfiguration: everscaleConfiguration.address,
        _solanaConfiguration: solanaConfiguration.address,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setSolanaAlienTokenRootCode({
        _tokenRootCode: alienTokenRootSolana.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setSolanaAlienTokenWalletCode({
        _tokenWalletCode: alienTokenWalletUpgradeableData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setOnceSolanaAlienTokenPlatformCode({
        _tokenPlatformCode: alienTokenWalletPlatformData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );
};

const setTVMConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V9Abi>,
  owner: Account,
  incomingConfigurations: Contract<TvmTvmEventConfigurationAbi>[],
): Promise<void> => {
  const alienTokenRootTVM = locklift.factory.getContractArtifacts("TokenRootAlienTVM");
  const alienTokenWalletUpgradeableData = locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
  const alienTokenWalletPlatformData = locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setTVMConfiguration({
        _incomingConfigurations: incomingConfigurations.map(e => e.address),
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setTVMAlienTokenRootCode({
        _tokenRootCode: alienTokenRootTVM.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setTVMAlienTokenWalletCode({
        _tokenWalletCode: alienTokenWalletUpgradeableData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setOnceTVMAlienTokenPlatformCode({
        _tokenPlatformCode: alienTokenWalletPlatformData.code,
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      }),
  );
};

const setCode = async (
  proxy: Contract<ProxyMultiVaultAlien_V9Abi>,
  owner: Account
): Promise<void> => {
  const bridgeTokenFeeCode = locklift.factory.getContractArtifacts( "BridgeTokenFee").code;
  const platformCode = locklift.factory.getContractArtifacts( "Platform").code;

  //set bridge token fee code
  await proxy.methods.setTokenFeeCode({_code: bridgeTokenFeeCode}).send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5)
  });

  //set platform
  await proxy.methods.setPlatformCode({_code: platformCode}).send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5)
  });
};

export const getBridgeTokenFee = async (
  token: Contract<FactorySource["TokenRoot"]>,
  proxy: Contract<FactorySource["ProxyMultiVaultAlien_V9"]>
): Promise<Contract<BridgeTokenFeeAbi>> => {

    let bridgeTokenFee = await proxy.methods.getExpectedTokenFeeAddress({_token: token.address, answerId: 0})
    .call()
    .then((a) => locklift.factory.getDeployedContract("BridgeTokenFee", a.value0));

    await logContract('BridgeTokenFee', bridgeTokenFee.address);
    return bridgeTokenFee;
}

export const setDefaultFee = async (
  proxy: Contract<FactorySource["ProxyMultiVaultAlien_V9"]>,
  owner: Account,
  incoming: number,
  outgoing: number
): Promise<void> => {
    await proxy.methods.setTvmDefaultFeeNumerator({_incoming: incoming, _outgoing: outgoing})
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5),
    });
}

export const deployBridgeTokenFeeAndSetFee = async (
  owner: Account,
  token: Contract<FactorySource["TokenRoot"]>,
  proxy: Contract<FactorySource["ProxyMultiVaultAlien_V9"]>,
  incoming: number,
  outgoing: number
): Promise<[Contract<BridgeTokenFeeAbi>, Contract<TokenWalletAbi>]> => {

  let proxyTokenWallet = await token.methods.walletOf({answerId: 0, walletOwner: proxy.address})
    .call()
    .then((a) =>  locklift.factory.getDeployedContract('TokenWallet', a.value0));

  // deploy bridgeTokenFee
  const { traceTree } = await locklift.tracing.trace(await proxy.methods.deployTokenFee({_token: proxyTokenWallet.address, _remainingGasTo: owner.address})
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(5),
    }));

  let bridgeTokenFee = await proxy.methods.getExpectedTokenFeeAddress({_token: proxyTokenWallet.address, answerId: 0})
    .call()
    .then((a) => locklift.factory.getDeployedContract("BridgeTokenFee", a.value0));

    await logContract('BridgeTokenFee', bridgeTokenFee.address);

  // Set fees
  await proxy.methods.setTvmDefaultFeeNumerator({_incoming: incoming, _outgoing: outgoing})
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5),
    });

  return [bridgeTokenFee, proxyTokenWallet];
};

