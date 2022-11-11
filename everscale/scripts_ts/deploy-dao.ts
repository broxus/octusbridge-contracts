export {};

const {
  logContract,
  isValidTonAddress,
  deployAccount,
  logger,
} = require("../test/utils");

const prompts = require("prompts");
const ora = require("ora");

const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Initial DAO owner",
      validate: (value: any) =>
        isValidTonAddress(value) ? true : "Invalid Everscale address",
    },
    {
      type: "number",
      name: "value",
      message: "DAO initial balance (in TONs)",
      initial: 5,
    },
    {
      type: "number",
      name: "votingDelay",
      message: "Delay (in seconds) before opening proposal for voting",
      initial: 0,
    },
    {
      type: "number",
      name: "votingPeriod",
      message: "Duration (in seconds) how long proposal is open for voting",
      initial: 0,
    },
    {
      type: "number",
      name: "quorumVotes",
      message:
        'The minimum number (satoshi) of votes "for" to accept the proposal',
      initial: 0,
    },
    {
      type: "number",
      name: "timeLock",
      message:
        "Duration (in seconds) between queuing of the proposal and its execution",
      initial: 0,
    },
    {
      type: "number",
      name: "threshold",
      message:
        "Required amount of tokens (satoshi) in steak to create a proposal",
      initial: 0,
    },
    {
      type: "number",
      name: "gracePeriod",
      message:
        "Duration (in seconds) from start of proposal can be executed to its expire",
      initial: 0,
    },
  ]);

  const proposalConfiguration = {
    votingDelay: response.votingDelay,
    votingPeriod: response.votingPeriod,
    quorumVotes: response.quorumVotes,
    timeLock: response.timeLock,
    threshold: response.threshold,
    gracePeriod: response.gracePeriod,
  };

  const tempAdmin = await deployAccount(signer, 5);

  const Platform = await locklift.factory.getContractArtifacts("Platform");
  const Proposal = await locklift.factory.getContractArtifacts("Proposal");

  const spinner = ora("Deploying DAO Root").start();

  const { contract: daoRoot } = await locklift.factory.deployContract({
    contract: "DaoRoot",
    constructorParams: {
      platformCode_: Platform.code,
      proposalConfiguration_: proposalConfiguration,
      admin_: tempAdmin.address,
    },
    initParams: { _nonce: locklift.utils.getRandomNonce() },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(response.value),
  });

  spinner.text = "Installing proposal code";

  const updateProposalCodeTx = await daoRoot.methods
    .updateProposalCode({
      code: Proposal.code,
    })
    .send({
      from: tempAdmin.address,
      amount: locklift.utils.toNano(1),
    });

  logger.log(`update Proposal Code tx: ${updateProposalCodeTx.id}`);

  spinner.text = "Transfer admin";

  const transferAdminTx = await daoRoot.methods
    .transferAdmin({
      newAdmin: response.owner,
    })
    .send({
      from: tempAdmin.address,
      amount: locklift.utils.toNano(1),
    });

  logger.log(`transfer Admin tx: ${transferAdminTx.id}`);

  spinner.stop();

  await logContract("daoRoot address", daoRoot.address);
};
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
