export {};

const {
  logContract,
  isValidTonAddress,
  stringToBytesArray,
} = require("../test/utils");

const prompts = require("prompts");
const fs = require("fs");
const ethers = require("ethers");
const ora = require("ora");
const BigNumber = require("bignumber.js");

const { Command } = require("commander");
const program = new Command();

program
  .option("--eventAbiFile <eventAbiFile>", "Event ABI file name")
  .option("--owner <owner>", "Configuration owner")
  .option("--staking <staking>", "Staking contract")
  .option(
    "--eventInitialBalance <eventInitialBalance>",
    "Event initial balance"
  )
  .option("--eventContract <eventContract>", "Event contract")
  .option("--meta <meta>", "Configuration meta")
  .option("--eventEmitter <eventEmitter>", "Event emitter address")
  .option("--proxy <proxy>", "Target proxy address")
  .option("--startTimestamp <startTimestamp>", "Start timestamp")
  .option("--initialBalance <initialBalance>", "Configuration initial balance")
  .allowUnknownOption();

program.parse(process.argv);

const options = program.opts();

const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  // Get all contracts from the build
  // @ts-ignore
  const build = [
    ...new Set(fs.readdirSync("build").map((o: string) => o.split(".")[0])),
  ];

  const events = fs
    .readdirSync("./build/")
    .filter((e: any) => e.endsWith(".abi.json"));

  const { eventAbiFile } = await prompts({
    type: "select",
    name: "eventAbiFile",
    message: "Select Everscale abi, which contains target event",
    choices: events.map((e: any) => new Object({ title: e, value: e })),
    initial:
      events.indexOf(options.eventAbiFile) >= 0
        ? events.indexOf(options.eventAbiFile)
        : 0,
  });

  const abi = JSON.parse(fs.readFileSync(`./build/${eventAbiFile}`));

  const { event } = await prompts({
    type: "select",
    name: "event",
    message: "Choose Everscale event",
    choices: abi.events.map((event: any) => {
      return {
        title: `${event.name} (${event.inputs
          .map((i: any) => i.type.concat(" ").concat(i.name))
          .join(",")})`,
        value: event.inputs,
      };
    }),
  });

  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Initial configuration owner",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid Everscale address",
      initial: options.owner,
    },
    {
      type: "text",
      name: "staking",
      message: "Staking contract",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid Everscale address",
      initial: options.staking,
    },
    {
      type: "number",
      name: "eventInitialBalance",
      message: "Event initial balance (in TONs)",
      initial: options.eventInitialBalance || 2,
    },
    {
      type: "select",
      name: "eventContract",
      message: "Choose event contract",
      choices: build.map((c) => new Object({ title: c, value: c })),
      initial:
        build.indexOf(options.eventContract) >= 0
          ? build.indexOf(options.eventContract)
          : 0,
    },
    {
      type: "text",
      name: "meta",
      message: "Configuration meta, can be empty (TvmCell encoded)",
      initial: options.meta,
    },
    {
      type: "text",
      name: "eventEmitter",
      message: "Contract address, which emits event (Everscale)",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid Everscale address",
      initial: options.eventEmitter,
    },
    {
      type: "text",
      name: "proxy",
      message: "Target address in Ethereum (proxy)",
      validate: (value: any) =>
        ethers.utils.isAddress(value) ? true : "Invalid Ethereum address",
      initial: options.proxy,
    },
    {
      type: "number",
      name: "startTimestamp",
      message: "Start timestamp",
      initial: options.startTimestamp || Math.floor(Date.now() / 1000),
    },
    {
      type: "number",
      name: "value",
      message: "Configuration initial balance (in TONs)",
      initial: options.initialBalance || 10,
    },
  ]);

  const TonEvent = await locklift.factory.getContractArtifacts(
    response.eventContract
  );

  const spinner = ora("Deploying Everscale event configuration").start();

  const { contract: everscaleEthereumEventConfiguration } =
    await locklift.factory.deployContract({
      contract: "EverscaleEthereumEventConfiguration",
      constructorParams: {
        _owner: response.owner,
        _meta: response.meta,
      },
      initParams: {
        basicConfiguration: {
          eventABI: stringToBytesArray(JSON.stringify(event)),
          eventInitialBalance: locklift.utils.toNano(
            response.eventInitialBalance
          ),
          staking: response.staking,
          eventCode: TonEvent.code,
        },
        networkConfiguration: {
          eventEmitter: response.eventEmitter,
          proxy: new BigNumber(response.proxy.toLowerCase()).toFixed(),
          startTimestamp: response.startTimestamp,
          endTimestamp: 0,
        },
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(response.value),
    });

  spinner.stop();

  await logContract(
    "everscaleEthereumEventConfiguration address",
    everscaleEthereumEventConfiguration.address
  );
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
