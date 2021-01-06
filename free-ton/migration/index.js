require('dotenv').config({ path: './../env/freeton.env' });

const freeton = require('ton-testing-suite');

const giverConfig = {
  address: process.env.GIVER_CONTRACT,
  abi: JSON.parse(process.env.GIVER_ABI),
};

const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
  giverConfig,
});


// Deploy contracts
(async () => {
  await tonWrapper.setup();
  
  tonWrapper.keys.map((key, i) => console.log(`Key #${i} - ${JSON.stringify(key)}`));

  const migration = new freeton.Migration(tonWrapper);
  
  const Bridge = await freeton
    .requireContract(tonWrapper, 'Bridge');
  
  // - Deploy Bridge
  await migration.deploy({
    contract: Bridge,
    constructorParams: {
    _relayKeys: tonWrapper.keys.map((key) => `0x${key.public}`),
      _bridgeConfiguration: {
        eventConfigurationRequiredConfirmations: 2,
        eventConfigurationRequiredRejects: 2,
        bridgeConfigurationUpdateRequiredConfirmations: 2,
        bridgeConfigurationUpdateRequiredRejects: 2,
        bridgeRelayUpdateRequiredConfirmations: 10,
        bridgeRelayUpdateRequiredRejects: 5,
        active: true,
      }
    },
    initParams: {},
    initialBalance: freeton.utils.convertCrystal('50', 'nano'),
    _randomNonce: true,
  }).catch(e => console.log(e));
  
  // - Prepare Ethereum event configuration
  const EthereumEventConfiguration = await freeton
    .requireContract(tonWrapper, 'EthereumEventConfiguration');
  const EthereumEvent = await freeton
    .requireContract(tonWrapper, 'EthereumEvent');

  // -- Deploy Proxy contract
  const EventProxy = await freeton.requireContract(tonWrapper, 'EventProxy');
  await migration.deploy({
    contract : EventProxy,
    constructorParams: {},
    initParams: {},
    initialBalance: freeton.utils.convertCrystal('10', 'nano'),
    _randomNonce: true,
  }).catch(e => console.log(e));
  
  // -- Deploy EventConfiguration
  await migration.deploy({
    contract: EthereumEventConfiguration,
    constructorParams: {},
    initParams: {
      eventABI: freeton.utils.stringToBytesArray(''),
      eventAddress: 0,
      eventRequiredConfirmations: 2,
      eventRequiredRejects: 2,
      eventBlocksToConfirm: 1,
      eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
      proxyAddress: EventProxy.address,
      bridgeAddress: Bridge.address,
      eventCode: EthereumEvent.code,
    },
    initialBalance: freeton.utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  // - Prepare TON event configuration
  const TonEventConfiguration = await freeton
    .requireContract(tonWrapper, 'TonEventConfiguration');
  const TonEvent = await freeton
    .requireContract(tonWrapper, 'TonEvent');
  
  // -- Deploy EventConfiguration (no Proxy contract deploy needed)
  await migration.deploy({
    contract: TonEventConfiguration,
    constructorParams: {},
    initParams: {
      eventABI: freeton.utils.stringToBytesArray(''),
      eventAddress: Bridge.address,
      eventRequiredConfirmations: 2,
      eventRequiredRejects: 2,
      eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
      proxyAddress: 0,
      bridgeAddress: Bridge.address,
      eventCode: TonEvent.code,
    },
    initialBalance: freeton.utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  migration.logHistory();
  
  process.exit(0);
})();
