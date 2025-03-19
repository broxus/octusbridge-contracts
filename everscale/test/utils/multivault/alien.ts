import {Account} from "everscale-standalone-client/nodejs";
import {Contract, zeroAddress} from "locklift";
import {
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi, EverscaleSolanaEventConfigurationAbi,
    FactorySource, ProxyMultiVaultAlien_V8Abi, SolanaEverscaleEventConfigurationAbi,
    TrustlessVerifierMockupAbi,
    TVMEverscaleEventConfigurationAbi,
} from "../../../build/factorySource";
import {logContract} from "../logger";
import {
    setupEthereumEverscaleEventConfiguration,
    setupEverscaleEthereumEventConfiguration
} from "../event-configurations/evm";
import {
    setupEverscaleSolanaEventConfiguration,
    setupSolanaEverscaleEventConfiguration
} from "../event-configurations/solana";
import { setupTVMEverscaleEventConfiguration } from "../event-configurations/tvm"

export const setupAlienMultiVault = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>,
    trustlessVerifier?: Contract<TrustlessVerifierMockupAbi>,
): Promise<[
    Contract<EthereumEverscaleEventConfigurationAbi>,
    Contract<EverscaleEthereumEventConfigurationAbi>,
    Contract<SolanaEverscaleEventConfigurationAbi>,
    Contract<EverscaleSolanaEventConfigurationAbi>,
    Contract<ProxyMultiVaultAlien_V8Abi>,
    Contract<TVMEverscaleEventConfigurationAbi>,
]> => {
    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = (await locklift.keystore.getSigner("2"))!;

    // Deploy proxy
    const { contract: proxy } = await locklift.factory.deployContract({
        contract: "ProxyMultiVaultAlien_V8",
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(15),
    });

    await logContract("ProxyMultiVaultAlien_V8", proxy.address);

    // Load event contracts
    const ethereumEverscaleEvent = locklift.factory.getContractArtifacts(
        "MultiVaultEVMEverscaleEventAlien"
    );
    const everscaleEthereumEvent = locklift.factory.getContractArtifacts(
        "MultiVaultEverscaleEVMEventAlien"
    );
    const solanaEverscaleEvent = locklift.factory.getContractArtifacts(
        "MultiVaultSolanaEverscaleEventAlien"
    );
    const everscaleSolanaEvent = locklift.factory.getContractArtifacts(
        "MultiVaultEverscaleSolanaEventAlien"
    );
    const tvmEverscaleEvent = locklift.factory.getContractArtifacts(
        "MultiVaultTVMEverscaleEventAlien"
    );


    // Deploy configurations
    const ethereumEverscaleEventConfiguration = await setupEthereumEverscaleEventConfiguration(
        owner, staking, proxy.address, ethereumEverscaleEvent.code
    );
    const everscaleEthereumEventConfiguration = await setupEverscaleEthereumEventConfiguration(
        owner, staking, proxy.address, everscaleEthereumEvent.code
    );
    const solanaEverscaleEventConfiguration = await setupSolanaEverscaleEventConfiguration(
        owner, staking, proxy.address, solanaEverscaleEvent.code
    );
    const everscaleSolanaEventConfiguration = await setupEverscaleSolanaEventConfiguration(
        owner, staking, proxy.address, everscaleSolanaEvent.code
    );
    const tvmEverscaleEventConfiguration = await setupTVMEverscaleEventConfiguration(
        owner, proxy.address, tvmEverscaleEvent.code, trustlessVerifier?.address || zeroAddress
    );

    // Set proxy EVM configuration
    await setEvmConfiguration(
      proxy,
      owner,
      everscaleEthereumEventConfiguration,
      [ethereumEverscaleEventConfiguration],
    );

    // Set proxy Solana configuration
    await setSolanaConfiguration(
      proxy,
      owner,
      everscaleSolanaEventConfiguration,
      solanaEverscaleEventConfiguration,
    );

    // Set proxy TVM configuration
    await setTVMConfiguration(
      proxy,
      owner,
      [tvmEverscaleEventConfiguration],
    );

    // Set merging
    const MergeRouter = locklift.factory.getContractArtifacts('MergeRouter');
    const MergePool = locklift.factory.getContractArtifacts('MergePool_V5');
    const MergePoolPlatform = locklift.factory.getContractArtifacts('MergePoolPlatform');

    await proxy.methods.setMergeRouter({
        _mergeRouter: MergeRouter.code
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(1)
    });

    await proxy.methods.setMergePool({
        _mergePool: MergePool.code
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(1)
    });

    await proxy.methods.setMergePoolPlatform({
        _mergePoolPlatform: MergePoolPlatform.code
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(1)
    });

    return [
        ethereumEverscaleEventConfiguration,
        everscaleEthereumEventConfiguration,
        solanaEverscaleEventConfiguration,
        everscaleSolanaEventConfiguration,
        proxy,
        tvmEverscaleEventConfiguration,
    ];
};

const setEvmConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V8Abi>,
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
        _evmConfigurations: evmConfigurations.map((e) => e.address),
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      })
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
}

const setSolanaConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V8Abi>,
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
      })
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
}

const setTVMConfiguration = async (
  proxy: Contract<ProxyMultiVaultAlien_V8Abi>,
  owner: Account,
  incomingConfigurations: Contract<TVMEverscaleEventConfigurationAbi>[],
): Promise<void> => {
  const alienTokenRootTVM = locklift.factory.getContractArtifacts("TokenRootAlienTVM");
  const alienTokenWalletUpgradeableData = locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
  const alienTokenWalletPlatformData = locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

  await locklift.transactions.waitFinalized(
    proxy.methods
      .setTVMConfiguration({
        _incomingConfigurations: incomingConfigurations.map((e) => e.address),
        _remainingGasTo: owner.address,
      })
      .send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
        bounce: true,
      })
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
}
