import {Address, getRandomNonce} from "locklift";
import {getConfig} from "./bootstrap/configs";
import assert from "node:assert";

const config = getConfig();

assert(!!config, "Config should be defined");
const main = async () => {

  await locklift.deployments.load();
  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: tvmTvmEventConfigFactory } = await locklift.factory.deployContract({
    contract: "TvmTvmEventConfigurationFactory",
    constructorParams: {
      _configurationCode: locklift.factory.getContractArtifacts("TvmTvmEventConfiguration").code,
      _transactionChecker: new Address(config?.TRANSACTION_CHECKER),
    },
    initParams: { _randomNonce: getRandomNonce() },
    publicKey: signer.publicKey,
    value: config?.GAS.DEPLOY_CONFIGURATION_FACTORY,
  });

  await locklift.deployments.saveContract({
    contractName: "TvmTvmEventConfigurationFactory",
    address: tvmTvmEventConfigFactory.address,
    deploymentName: "TvmTvmEventConfigFactory",
  });

  console.log(`TvmTvmEventConfigFactory: ${tvmTvmEventConfigFactory.address}`);

};

main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
