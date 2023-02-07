export {};

const { logContract } = require("../test/utils/logger");
const ora = require("ora");

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const _randomNonce = locklift.utils.getRandomNonce();

  const spinner = ora();

  spinner.start("Deploying Ethereum Everscale event configuration factory");

  const EthereumEverscaleEventConfiguration =
    await locklift.factory.getContractArtifacts(
      "EthereumEverscaleEventConfiguration"
    );

  const { contract: ethereumEverscaleEventConfigurationFactory } =
    await locklift.factory.deployContract({
      contract: "EthereumEverscaleEventConfigurationFactory",
      constructorParams: {
        _configurationCode: EthereumEverscaleEventConfiguration.code,
      },
      initParams: {
        _randomNonce,
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(2),
    });

  spinner.stop();

  await logContract(
    "ethereumEverscaleEventConfigurationFactory address",
    ethereumEverscaleEventConfigurationFactory.address
  );

  // Everscale configuration factory
  const EverscaleEthereumEventConfiguration =
    await locklift.factory.getContractArtifacts(
      "EverscaleEthereumEventConfiguration"
    );

  spinner.start("Deploying Everscale EVM event configuration factory");

  const { contract: everscaleEthereumEventConfigurationFactory } =
    await locklift.factory.deployContract({
      contract: "EverscaleEthereumEventConfigurationFactory",
      constructorParams: {
        _configurationCode: EverscaleEthereumEventConfiguration.code,
      },
      initParams: {
        _randomNonce,
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(2),
    });

  spinner.stop();

  await logContract(
    "everscaleEthereumEventConfigurationFactory address",
    everscaleEthereumEventConfigurationFactory.address
  );

  spinner.start("Deploying Solana Ever event configuration factory");

  const SolanaEverscaleEventConfiguration =
    await locklift.factory.getContractArtifacts(
      "SolanaEverscaleEventConfiguration"
    );

  const { contract: solanaEverscaleEventConfigurationFactory } =
    await locklift.factory.deployContract({
      contract: "SolanaEverscaleEventConfigurationFactory",
      constructorParams: {
        _configurationCode: SolanaEverscaleEventConfiguration.code,
      },
      initParams: {
        _randomNonce,
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(2),
    });

  spinner.stop();

  await logContract(
    "solanaEverscaleEventConfigurationFactory address",
    solanaEverscaleEventConfigurationFactory.address
  );

  // Everscale configuration factory
  const EverscaleSolanaEventConfiguration =
    await locklift.factory.getContractArtifacts(
      "EverscaleSolanaEventConfiguration"
    );

  spinner.start("Deploying Everscale Solana event configuration factory");

  const { contract: everscaleSolanaEventConfigurationFactory } =
    await locklift.factory.deployContract({
      contract: "EverscaleSolanaEventConfigurationFactory",
      constructorParams: {
        _configurationCode: EverscaleSolanaEventConfiguration.code,
      },
      initParams: {
        _randomNonce,
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(2),
    });

  spinner.stop();

  await logContract(
    "everscaleSolanaEventConfigurationFactory address",
    everscaleSolanaEventConfigurationFactory.address
  );

  // Proxy token transfer factory
  const ProxyTokenTransfer = await locklift.factory.getContractArtifacts(
    "ProxyTokenTransfer"
  );

  spinner.start("Deploying proxy token transfer factory");

  const { contract: proxyTokenTransferFactory } =
    await locklift.factory.deployContract({
      contract: "ProxyTokenTransferFactory",
      constructorParams: {
        _proxyCode: ProxyTokenTransfer.code,
      },
      initParams: {
        _randomNonce,
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(2),
    });

  spinner.stop();

  await logContract(
    "proxyTokenTransferFactory address",
    proxyTokenTransferFactory.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
