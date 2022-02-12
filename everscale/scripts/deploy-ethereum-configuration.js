const {
  logContract,
  isValidTonAddress,
  stringToBytesArray,
} = require('./../test/utils');

const prompts = require('prompts');
const fs = require('fs');
const ethers = require('ethers');
const ora = require('ora');
const BigNumber = require('bignumber.js');

const { Command } = require('commander');
const program = new Command();

const networks = [
  { title: 'Goerli',  value: 5 },
  { title: 'Ropsten',  value: 3 },
  { title: 'Ethereum',  value: 1 },
  { title: 'BSC',  value: 56 },
  { title: 'Fantom',  value: 250 },
  { title: 'Polygon',  value: 137 },
];

program
    .option('--eventAbiFile <eventAbiFile>', 'Event ABI file name')
    .option('--owner <owner>', 'Configuration owner')
    .option('--staking <staking>', 'Staking contract')
    .option('--eventInitialBalance <eventInitialBalance>', 'Event initial balance')
    .option('--eventContract <eventContract>', 'Event contract')
    .option('--meta <meta>', 'Configuration meta')
    .option('--chainId <chainId>', 'EVM network chain id', parseInt)
    .option('--eventEmitter <eventEmitter>', 'Event emitter address')
    .option('--eventBlocksToConfirm <eventBlocksToConfirm>', 'Event blocks to confirm')
    .option('--proxy <proxy>', 'Target proxy address')
    .option('--startBlockNumber <startBlockNumber>', 'Start block number')
    .option('--initialBalance <initialBalance>', 'Configuration initial balance')
    .allowUnknownOption();


program.parse(process.argv);

const options = program.opts();

const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  // Get all contracts from the build
  const build = [...new Set(fs.readdirSync('build').map(o => o.split('.')[0]))];
  
  const events = fs.readdirSync('./../ethereum/abi');
  
  const {
    eventAbiFile
  } = await prompts({
    type: 'select',
    name: 'eventAbiFile',
    message: 'Select Ethereum ABI, which contains target event',
    choices: events.map(e => new Object({ title: e, value: e })),
    initial: events.indexOf(options.eventAbiFile) >= 0 ? events.indexOf(options.eventAbiFile) : 0
  });

  const abi = JSON.parse(fs.readFileSync(`./../ethereum/abi/${eventAbiFile}`));
  
  const {
    event
  } = await prompts({
    type: 'select',
    name: 'event',
    message: 'Choose Ethereum event',
    choices: abi
      .filter(o => o.type == 'event' && o.anonymous == false)
      .map(event => {
        return {
          title: `${event.name} (${event.inputs.map(i => i.type.concat(' ').concat(i.name)).join(',')})`,
          value: event,
        }
      }),
  });

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial configuration owner',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address',
      initial: options.owner
    },
    {
      type: 'text',
      name: 'staking',
      message: 'Staking contract',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address',
      initial: options.staking
    },
    {
      type: 'number',
      name: 'eventInitialBalance',
      message: 'Event initial balance (in TONs)',
      initial: options.eventInitialBalance || 2
    },
    {
      type: 'select',
      name: 'eventContract',
      message: 'Choose event contract',
      choices: build.map(c => new Object({ title: c, value: c })),
      initial: build.indexOf(options.eventContract) >= 0 ? build.indexOf(options.eventContract) : 0,
    },
    {
      type: 'text',
      name: 'meta',
      message: 'Configuration meta, can be empty (TvmCell encoded)',
      initial: options.meta
    },
    {
      type: 'select',
      name: 'chainId',
      message: 'Choose network',
      choices: networks,
      initial: networks.map(n => n.value).indexOf(options.chainId) >= 0 ? networks.map(n => n.value).indexOf(options.chainId) : 0
    },
    {
      type: 'text',
      name: 'eventEmitter',
      message: 'Contract address, which emits event (Ethereum)',
      validate: value => ethers.utils.isAddress(value) ? true : 'Invalid Ethereum address',
      initial: options.eventEmitter
    },
    {
      type: 'number',
      name: 'eventBlocksToConfirm',
      message: 'Blocks to confirm',
      initial: options.eventBlocksToConfirm || 12,
    },
    {
      type: 'text',
      name: 'proxy',
      message: 'Target address in FreeTON (proxy)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address',
      initial: options.proxy
    },
    {
      type: 'number',
      name: 'startBlockNumber',
      message: 'Start block number',
      initial: options.startBlockNumber
    },
    {
      type: 'number',
      name: 'value',
      message: 'Configuration initial balance (in TONs)',
      initial: options.initialBalance || 10,
    },
  ]);
  
  const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
  const EthereumEvent = await locklift.factory.getContract(response.eventContract);
  
  const spinner = ora('Deploying Ethereum event configuration').start();
  
  const ethereumEventConfiguration = await locklift.giver.deployContract({
    contract: EthereumEventConfiguration,
    constructorParams: {
      _owner: response.owner,
      _meta: response.meta,
    },
    initParams: {
      basicConfiguration: {
        eventABI: stringToBytesArray(JSON.stringify(event)),
        eventInitialBalance: locklift.utils.convertCrystal(response.eventInitialBalance, 'nano'),
        staking: response.staking,
        eventCode: EthereumEvent.code,
      },
      networkConfiguration: {
        chainId: response.chainId,
        eventEmitter: new BigNumber(response.eventEmitter.toLowerCase()).toFixed(),
        eventBlocksToConfirm: response.eventBlocksToConfirm,
        proxy: response.proxy,
        startBlockNumber: response.startBlockNumber,
        endBlockNumber: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(response.value, 'nano'));
  
  spinner.stop();
  
  await logContract(ethereumEventConfiguration);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
