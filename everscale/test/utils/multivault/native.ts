import { Account } from "everscale-standalone-client/nodejs";
import { Address, Contract } from "locklift";
import {
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  FactorySource,
  ProxyMultiVaultNative_V8Abi,
  SolanaEverscaleEventConfigurationAbi,
  TvmTvmEventConfigurationAbi,
  BridgeTokenFeeAbi,
  TokenWalletAbi
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

export const setupNativeMultiVault = async (
  owner: Account,
  staking: Contract<FactorySource["StakingMockup"]>,
  trustlessVerifier: Contract<FactorySource["TrustlessVerifierMockup"]>,
): Promise<
  [
    Contract<EthereumEverscaleEventConfigurationAbi>,
    Contract<EverscaleEthereumEventConfigurationAbi>,
    Contract<SolanaEverscaleEventConfigurationAbi>,
    Contract<EverscaleSolanaEventConfigurationAbi>,
    Contract<ProxyMultiVaultNative_V8Abi>,
    Contract<TvmTvmEventConfigurationAbi>,
  ]
> => {
  const _randomNonce = locklift.utils.getRandomNonce();
  const signer = (await locklift.keystore.getSigner("2"))!;

  // Deploy proxy
  const { contract: proxy } = await locklift.factory.deployContract({
    contract: "ProxyMultiVaultNative_V8",
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(15),
  });

  await logContract("ProxyMultiVaultNative_V8", proxy.address);

  // Load event contracts
  const ethereumEverscaleEvent = await locklift.factory.getContractArtifacts("MultiVaultEVMEverscaleEventNative");
  const everscaleEthereumEvent = await locklift.factory.getContractArtifacts("MultiVaultEverscaleEVMEventNative");
  const solanaEverscaleEvent = await locklift.factory.getContractArtifacts("MultiVaultSolanaEverscaleEventNative");
  const everscaleSolanaEvent = await locklift.factory.getContractArtifacts("MultiVaultEverscaleSolanaEventNative");
  const tvmTvmEvent = await locklift.factory.getContractArtifacts("MultiVaultTvmTvmEventNative");

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
    tvmTvmEvent.code,
    trustlessVerifier.address,
    new Address("0:057493dab4639b455bd9305c0c2cc44d30cf48e5b185b6cc05a0d102c91e0fe8")
  );

  // Set proxy EVM configuration
  await proxy.methods
    .setEVMConfiguration({
      _config: {
        everscaleConfiguration: everscaleEthereumEventConfiguration.address,
        evmConfigurations: [ethereumEverscaleEventConfiguration.address],
      },
      remainingGasTo: owner.address,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5),
    });

  // Set proxy Solana configuration
  await proxy.methods
    .setSolanaConfiguration({
      _config: {
        everscaleConfiguration: everscaleSolanaEventConfiguration.address,
        solanaConfiguration: solanaEverscaleEventConfiguration.address,
      },
      remainingGasTo: owner.address,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5),
    });

  // Set proxy TVM configuration
  await proxy.methods
    .setTVMConfiguration({
      _incomingConfigurations: [tvmTvmEventConfiguration.address],
      remainingGasTo: owner.address,
    })
    .send({
      from: owner.address,
      amount: locklift.utils.toNano(0.5),
    });

  return [
    ethereumEverscaleEventConfiguration,
    everscaleEthereumEventConfiguration,
    solanaEverscaleEventConfiguration,
    everscaleSolanaEventConfiguration,
    proxy,
    tvmTvmEventConfiguration,
  ];
};

export const deployBridgeTokenFeeAndSetFee = async (
  owner: Account,
  token: Contract<FactorySource["TokenRoot"]>,
  proxy: Contract<FactorySource["ProxyMultiVaultNative_V8"]>,
  incoming: number,
  outgoing: number
): Promise<[Contract<BridgeTokenFeeAbi>, Contract<TokenWalletAbi>]> => {
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

  let proxyTokenWallet = await token.methods.walletOf({answerId: 0, walletOwner: proxy.address})
    .call()
    .then((a) =>  locklift.factory.getDeployedContract('TokenWallet', a.value0));

  // deploy bridgeTokenFee
  const { traceTree } = await locklift.tracing.trace(proxy.methods.deployTokenFee({_token: proxyTokenWallet.address, _remainingGasTo: owner.address})
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
