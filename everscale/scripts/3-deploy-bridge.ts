export {};

const { isValidTonAddress } = require("../test/utils");
import {logContract} from "../test/utils/logger";

const prompts = require("prompts");
const ora = require("ora");

const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Bridge initial owner (can be changed later)",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid address",
    },
    {
      type: "text",
      name: "staking",
      message: "Staking contract",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid address",
    },
    {
      type: "text",
      name: "manager",
      message: "Bridge initial manager",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid address",
    },
    {
      type: "number",
      name: "connectorDeployValue",
      initial: 100,
      message: "Connector deploy value (in TONs)",
    },
    {
      type: "number",
      name: "value",
      initial: 1,
      message: "Bridge deploy value (in TONs)",
    },
  ]);

  const spinner = ora("Deploying bridge").start();

  const Connector = await locklift.factory.getContractArtifacts("Connector");

  const { contract: bridge } = await locklift.factory.deployContract({
    contract: "Bridge",
    constructorParams: {
      _owner: response.owner,
      _manager: response.manager,
      _staking: response.staking,
      _connectorCode: Connector.code,
      _connectorDeployValue: locklift.utils.toNano(
        response.connectorDeployValue
      ),
    },
    initParams: { _randomNonce: locklift.utils.getRandomNonce() },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(response.value),
  });

  spinner.stop();

  await logContract("bridge address", bridge.address);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
