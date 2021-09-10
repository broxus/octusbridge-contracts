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


const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  // Get all contracts from the build
  const build = [...new Set(fs.readdirSync('build').map(o => o.split('.')[0]))];
  
  const {
    eventAbiPath
  } = await prompts({
    type: 'text',
    name: 'eventAbiPath',
    message: 'Path to the ABI file, which contains target event',
    initial: './build/ProxyTokenTransfer.abi.json',
    validate: value => fs.existsSync(value) ? true : 'Path not exist'
  });
  
  const abi = JSON.parse(fs.readFileSync(eventAbiPath));
  
  const {
    event
  } = await prompts({
    type: 'select',
    name: 'event',
    message: 'Choose TON event',
    choices: abi
      .events
      .map(event => {
        return {
          title: `${event.name} (${event.inputs.map(i => i.name).join(',')})`,
          value: event.inputs,
        }
      }),
  });
  
  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial configuration owner',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    },
    {
      type: 'text',
      name: 'staking',
      message: 'Staking contract',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    },
    {
      type: 'number',
      name: 'eventInitialBalance',
      initial: 2,
      message: 'Event initial balance (in TONs)'
    },
    {
      type: 'select',
      name: 'eventContract',
      message: 'Choose event contract',
      choices: build.map(c => new Object({ title: c, value: c }))
    },
    {
      type: 'text',
      name: 'meta',
      message: 'Configuration meta, can be empty (TvmCell encoded)',
    },
    {
      type: 'text',
      name: 'eventEmitter',
      message: 'Contract address, which emits event (TON)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    },
    {
      type: 'text',
      name: 'proxy',
      message: 'Target address in Ethereum (proxy)',
      validate: value => ethers.utils.isAddress(value) ? true : 'Invalid Ethereum address'
    },
    {
      type: 'number',
      name: 'startTimestamp',
      message: 'Start timestamp'
    },
    {
      type: 'number',
      name: 'value',
      message: 'Configuration initial balance (in TONs)',
      initial: 10
    }
  ]);
  
  const TonEventConfiguration = await locklift.factory.getContract('TonEventConfiguration');
  const TonEvent = await locklift.factory.getContract(response.eventContract);
  
  const spinner = ora('Deploying TON event configuration').start();
  
  const tonEventConfiguration = await locklift.giver.deployContract({
    contract: TonEventConfiguration,
    constructorParams: {
      _owner: response.owner,
      _meta: response.meta,
    },
    initParams: {
      basicConfiguration: {
        eventABI: stringToBytesArray(JSON.stringify(event)),
        eventInitialBalance: locklift.utils.convertCrystal(response.eventInitialBalance, 'nano'),
        staking: response.staking,
        eventCode: TonEvent.code,
      },
      networkConfiguration: {
        eventEmitter: response.eventEmitter,
        proxy: new BigNumber(response.proxy.toLowerCase()).toFixed(),
        startTimestamp: response.startTimestamp,
        endTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(response.value, 'nano'));
  
  spinner.stop();
  
  await logContract(tonEventConfiguration);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });

