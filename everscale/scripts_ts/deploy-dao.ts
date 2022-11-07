const {
  logContract,
  isValidTonAddress,
} = require('../test/utils2');


const prompts = require('prompts');
const ora = require('ora');


const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial DAO owner',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'number',
      name: 'value',
      message: 'DAO initial balance (in TONs)',
      initial: 5
    },
    {
      type: 'number',
      name: 'votingDelay',
      message: 'Delay (in seconds) before opening proposal for voting',
      initial: 0
    },
    {
      type: 'number',
      name: 'votingPeriod',
      message: 'Duration (in seconds) how long proposal is open for voting',
      initial: 0
    },
    {
      type: 'number',
      name: 'quorumVotes',
      message: 'The minimum number (satoshi) of votes "for" to accept the proposal',
      initial: 0
    },
    {
      type: 'number',
      name: 'timeLock',
      message: 'Duration (in seconds) between queuing of the proposal and its execution',
      initial: 0
    },
    {
      type: 'number',
      name: 'threshold',
      message: 'Required amount of tokens (satoshi) in steak to create a proposal',
      initial: 0
    },
    {
      type: 'number',
      name: 'gracePeriod',
      message: 'Duration (in seconds) from start of proposal can be executed to its expire',
      initial: 0
    }
  ]);

  const proposalConfiguration = {
    votingDelay: response.votingDelay,
    votingPeriod: response.votingPeriod,
    quorumVotes: response.quorumVotes,
    timeLock: response.timeLock,
    threshold: response.threshold,
    gracePeriod: response.gracePeriod
  }
  const Account = await locklift.factory.getAccount('Wallet');

  let tempAdmin = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair
  }, locklift.utils.convertCrystal(5, 'nano'));
  tempAdmin.setKeyPair(keyPair);

  const Platform = await locklift.factory.getContract('Platform');
  const DaoRoot = await locklift.factory.getContract('DaoRoot');
  const Proposal = await locklift.factory.getContract('Proposal');

  const spinner = ora('Deploying DAO Root').start();

  const daoRoot = await locklift.giver.deployContract({
    contract: DaoRoot,
    constructorParams: {
      platformCode_: Platform.code,
      proposalConfiguration_: proposalConfiguration,
      admin_: tempAdmin.address
    },
    initParams: {
      _nonce: locklift.utils.getRandomNonce(),
    },
    keyPair: keyPair,
  }, locklift.utils.convertCrystal(response.value, 'nano'));

  spinner.text = 'Installing proposal code';

  await tempAdmin.runTarget({
    contract: daoRoot,
    method: 'updateProposalCode',
    params: {code: Proposal.code},
    value: locklift.utils.convertCrystal(1, 'nano')
  });
  spinner.text = 'Transfer admin';
  await tempAdmin.runTarget({
    contract: daoRoot,
    method: 'transferAdmin',
    params: {newAdmin: response.owner},
    value: locklift.utils.convertCrystal(1, 'nano')
  });
  spinner.stop();


  await logContract(daoRoot);
};
main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
