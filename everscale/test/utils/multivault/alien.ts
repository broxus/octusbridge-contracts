import {Account} from "everscale-standalone-client/nodejs";
import {Contract} from "locklift";
import {
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi, EverscaleSolanaEventConfigurationAbi,
    FactorySource, ProxyMultiVaultAlien_V8Abi, SolanaEverscaleEventConfigurationAbi
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


export const setupAlienMultiVault = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>
): Promise<[
    Contract<EthereumEverscaleEventConfigurationAbi>,
    Contract<EverscaleEthereumEventConfigurationAbi>,
    Contract<SolanaEverscaleEventConfigurationAbi>,
    Contract<EverscaleSolanaEventConfigurationAbi>,
    Contract<ProxyMultiVaultAlien_V8Abi>
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

    // Load proxy settings
    const alienTokenRootEVM = locklift.factory.getContractArtifacts("TokenRootAlienEVM");
    const alienTokenRootSolana = locklift.factory.getContractArtifacts("TokenRootAlienSolana");
    const alienTokenRootTVM = locklift.factory.getContractArtifacts("TokenRootAlienTVM");

    const alienTokenWalletUpgradeableData =
        locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
    const alienTokenWalletPlatformData =
        locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

    // Set proxy EVM configuration
    await proxy.methods
        .setEVMConfiguration({
            _everscaleConfiguration: everscaleEthereumEventConfiguration.address,
            _evmConfigurations: [ethereumEverscaleEventConfiguration.address],
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    await proxy.methods
        .setEVMAlienTokenRootCode({
            _tokenRootCode: alienTokenRootEVM.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    await proxy.methods
        .setEVMAlienTokenWalletCode({
            _tokenWalletCode: alienTokenWalletUpgradeableData.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    await proxy.methods
        .setOnceEVMAlienTokenPlatformCode({
            _tokenPlatformCode: alienTokenWalletPlatformData.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    // Set proxy Solana configuration
    await proxy.methods
        .setSolanaConfiguration({
            _everscaleConfiguration: everscaleSolanaEventConfiguration.address,
            _solanaConfiguration: solanaEverscaleEventConfiguration.address,
            _remainingGasTo: owner.address
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5)
        });

    await proxy.methods
        .setSolanaAlienTokenRootCode({
            _tokenRootCode: alienTokenRootSolana.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    await proxy.methods
        .setSolanaAlienTokenWalletCode({
            _tokenWalletCode: alienTokenWalletUpgradeableData.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    await proxy.methods
        .setOnceSolanaAlienTokenPlatformCode({
            _tokenPlatformCode: alienTokenWalletPlatformData.code,
            _remainingGasTo: owner.address,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(0.5),
        });

    // Set proxy TVM configuration
    await proxy.methods
      .setTVMConfiguration({
          _incomingConfigurations: [], // TODO: add configurations
          _remainingGasTo: owner.address,
      })
      .send({
          from: owner.address,
          amount: locklift.utils.toNano(0.5),
      });

    await proxy.methods
      .setTVMAlienTokenRootCode({
          _tokenRootCode: alienTokenRootTVM.code,
          _remainingGasTo: owner.address,
      })
      .send({
          from: owner.address,
          amount: locklift.utils.toNano(0.5),
      });

    await proxy.methods
      .setTVMAlienTokenWalletCode({
          _tokenWalletCode: alienTokenWalletUpgradeableData.code,
          _remainingGasTo: owner.address,
      })
      .send({
          from: owner.address,
          amount: locklift.utils.toNano(0.5),
      });

    await proxy.methods
      .setOnceTVMAlienTokenPlatformCode({
          _tokenPlatformCode: alienTokenWalletPlatformData.code,
          _remainingGasTo: owner.address,
      })
      .send({
          from: owner.address,
          amount: locklift.utils.toNano(0.5),
      });

    // Set merging
    const MergeRouter = await locklift.factory.getContractArtifacts('MergeRouter');
    const MergePool = await locklift.factory.getContractArtifacts('MergePool_V5');
    const MergePoolPlatform = await locklift.factory.getContractArtifacts('MergePoolPlatform');

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
    ];
};
