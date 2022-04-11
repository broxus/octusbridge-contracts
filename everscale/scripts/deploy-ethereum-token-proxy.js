const {
  logContract,
  isValidTonAddress,
} = require('./../test/utils');


const prompts = require('prompts');
const ora = require('ora');


const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial proxy owner',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'number',
      name: 'value',
      message: 'Proxy initial balance (in TONs)',
      initial: 10
    }
  ]);
  
  const EthereumProxyTokenTransfer = await locklift.factory.getContract('EthereumProxyTokenTransfer');
  
  const spinner = ora('Deploying ethereum token transfer proxy').start();
  
  const proxy = await locklift.giver.deployContract({
    contract: EthereumProxyTokenTransfer,
    constructorParams: {
      owner_: response.owner,
    },
    initParams: {},
    keyPair
  }, locklift.utils.convertCrystal(response.value, 'nano'));
  
  spinner.stop();
  
  await logContract(proxy);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
