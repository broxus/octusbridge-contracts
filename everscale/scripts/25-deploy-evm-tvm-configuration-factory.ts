import { getRandomNonce } from "locklift";
import { getConfig } from "./bootstrap/configs";
import assert from "node:assert";

const config = getConfig();

assert(!!config, "Config should be defined");
const main = async () => {
  await locklift.deployments.load();
  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: ethereumEverscaleEventConfigurationFactory } = await locklift.factory.deployContract({
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
    address: ethereumEverscaleEventConfigurationFactory.address,
    deploymentName: "EthereumEverscaleEventConfigurationFactory",
  });

  console.log(`EthereumEverscaleEventConfigFactory: ${ethereumEverscaleEventConfigurationFactory.address}`);
};

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
