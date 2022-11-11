export {};

const { logContract, isValidTonAddress } = require("../test/utils");

const prompts = require("prompts");
const ora = require("ora");

const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Initial proxy owner",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid Everscale address",
    },
    {
      type: "number",
      name: "value",
      message: "Proxy initial balance (in TONs)",
      initial: 10,
    },
  ]);

  const spinner = ora("Deploying token transfer proxy").start();

  const { contract: proxy } = await locklift.factory.deployContract({
    contract: "ProxyTokenTransfer",
    constructorParams: {
      owner_: response.owner,
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(response.value),
  });

  spinner.stop();

  await logContract("proxy address", proxy.address);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
