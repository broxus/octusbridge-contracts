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
  
  const events = fs.readdirSync('./../ethereum/abi');
  
  const {
    eventAbiFile
  } = await prompts({
    type: 'select',
    name: 'eventAbiFile',
    message: 'Select Ethereum ABI, which contains target event',
    choices: events.map(e => new Object({ title: e, value: e }))
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
      type: 'select',
      name: 'chainId',
      message: 'Choose network',
      choices: [
        { title: 'Goerli',  value: 5 },
        { title: 'Ropsten',  value: 3 },
        { title: 'Ethereum',  value: 1 },
        { title: 'BSC',  value: 56 },
        { title: 'Fantom',  value: 250 },
        { title: 'Polygon',  value: 137 },
      ],
    },
    {
      type: 'text',
      name: 'eventEmitter',
      message: 'Contract address, which emits event (Ethereum)',
      validate: value => ethers.utils.isAddress(value) ? true : 'Invalid Ethereum address'
    },
    {
      type: 'number',
      name: 'eventBlocksToConfirm',
      message: 'Blocks to confirm',
      initial: 12,
    },
    {
      type: 'text',
      name: 'proxy',
      message: 'Target address in FreeTON (proxy)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    },
    {
      type: 'number',
      name: 'startBlockNumber',
      message: 'Start block number'
    },
    {
      type: 'number',
      name: 'value',
      message: 'Configuration initial balance (in TONs)',
      initial: 10
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