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

program
    .option('--eventAbiFile <eventAbiFile>', 'Event ABI file name')
    .option('--owner <owner>', 'Configuration owner')
    .option('--staking <staking>', 'Staking contract')
    .option('--eventInitialBalance <eventInitialBalance>', 'Event initial balance')
    .option('--eventContract <eventContract>', 'Event contract')
    .option('--meta <meta>', 'Configuration meta')
    .option('--program <program>', 'Target program address')
    .option('--settings <settings>', 'Settings address in Solana')
    .option('--proxy <proxy>', 'Target proxy address')
    .option('--initialBalance <initialBalance>', 'Configuration initial balance')
    .allowUnknownOption();


program.parse(process.argv);

const options = program.opts();

const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  // Get all contracts from the build
  const build = [...new Set(fs.readdirSync('build').map(o => o.split('.')[0]))];
  
  const events = fs.readdirSync('./../solana/abi');
  
  const {
    eventAbiFile
  } = await prompts({
    type: 'select',
    name: 'eventAbiFile',
    message: 'Select Solana ABI, which contains target event',
    choices: events.map(e => new Object({ title: e, value: e })),
    initial: events.indexOf(options.eventAbiFile) >= 0 ? events.indexOf(options.eventAbiFile) : 0
  });

  const abi = JSON.parse(fs.readFileSync(`./../solana/abi/${eventAbiFile}`));
  
  const {
    event
  } = await prompts({
    type: 'select',
    name: 'event',
    message: 'Choose Solana event',
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
      type: 'text',
      name: 'program',
      message: 'Target address in Solana (program)',
      initial: options.program
    },
    {
      type: 'text',
      name: 'settings',
      message: 'Settings address (Solana)',
      initial: options.settings
    },
    {
      type: 'text',
      name: 'proxy',
      message: 'Target address in Everscale (proxy)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address',
      initial: options.proxy
    },
    {
      type: 'number',
      name: 'value',
      message: 'Configuration initial balance (in TONs)',
      initial: options.initialBalance || 10,
    },
  ]);
  
  const SolanaEverscaleEventConfiguration = await locklift.factory.getContract('SolanaEverscaleEventConfiguration');
  const SolanaEvent = await locklift.factory.getContract(response.eventContract);
  
  const spinner = ora('Deploying Solana event configuration').start();
  
  const solanaEverscaleEventConfiguration = await locklift.giver.deployContract({
    contract: SolanaEverscaleEventConfiguration,
    constructorParams: {
      _owner: response.owner,
      _meta: response.meta,
    },
    initParams: {
      basicConfiguration: {
        eventABI: stringToBytesArray(JSON.stringify(event)),
        eventInitialBalance: locklift.utils.convertCrystal(response.eventInitialBalance, 'nano'),
        staking: response.staking,
        eventCode: SolanaEvent.code,
      },
      networkConfiguration: {
        program: new BigNumber(response.program.toLowerCase()).toFixed(),
        settings: new BigNumber(response.settings.toLowerCase()).toFixed(),
        proxy: response.proxy,
        startTimestamp: 0,
        endTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(response.value, 'nano'));
  
  spinner.stop();
  
  await logContract(solanaEverscaleEventConfiguration);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
