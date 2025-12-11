import { getRandomNonce } from "locklift";
import { getConfig } from "./bootstrap/configs";
import assert from "node:assert";

const config = getConfig();

assert(!!config, "Config should be defined");
const main = async () => {
  await locklift.deployments.load();
  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: everscaleEthereumEventConfigurationFactory } = await locklift.factory.deployContract({
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
    address: everscaleEthereumEventConfigurationFactory.address,
    deploymentName: "TvmEvmEventConfigFactory",
  });

  console.log(`TvmEvmEventConfigFactory: ${everscaleEthereumEventConfigurationFactory.address}`);
};

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
