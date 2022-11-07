const {
  logContract,
  isValidTonAddress,
} = require('../test/utils2');

const prompts = require('prompts');
const ora = require('ora');


const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const Bridge = await locklift.factory.getContract('Bridge');
  const Connector = await locklift.factory.getContract('Connector');
  
  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Bridge initial owner (can be changed later)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'staking',
      message: 'Staking contract',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'manager',
      message: 'Bridge initial manager',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'number',
      name: 'connectorDeployValue',
      initial: 100,
      message: 'Connector deploy value (in TONs)'
    },
    {
      type: 'number',
      name: 'value',
      initial: 1,
      message: 'Bridge deploy value (in TONs)'
    }
  ]);
  
  const spinner = ora('Deploying bridge').start();
  
  const bridge = await locklift.giver.deployContract({
    contract: Bridge,
    constructorParams: {
      _owner: response.owner,
      _manager: response.manager,
      _staking: response.staking,
      _connectorCode: Connector.code,
      _connectorDeployValue: locklift.utils.convertCrystal(
        response.connectorDeployValue,
        'nano'
      ),
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair
  }, locklift.utils.convertCrystal(response.value, 'nano'));
  
  spinner.stop();
  
  await logContract(bridge);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
