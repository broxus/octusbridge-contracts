const logger = require('mocha-logger');


const setupBridge = async () => {
  const Bridge = await locklift.factory.getContract('Bridge');
  const CellEncoder = await locklift.factory
  const Account = await locklift.factory.getAccount();
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const owner = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce()
    },
    keyPair,
  }, locklift.utils.convertCrystal(30, 'nano'));
  
  const bridge = await locklift.giver.deployContract({
    contract: Bridge,
    constructorParams: {
      _owner: owner.address,
      _bridgeConfiguration: {
        active: true,
        staking: owner.address,
      }
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair
  }, locklift.utils.convertCrystal(10, 'nano'));
  
  logger.log(`Bridge owner address: ${owner.address}`);
  logger.log(`Bridge address: ${bridge.address}`);
  
  return { bridge, owner };
};


module.exports = {
  setupBridge,
  logger,
};
