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
  // - EthereumEventConfiguration needs to have Proxy address to deploy
  // - Proxy needs to have EthereumEventConfiguration address to deploy
  // - So derive Proxy address first
  // - Deploy EthereumEventConfiguration with derived Proxy address
  // - Deploy Proxy with EthereumEventConfiguration address
  const EthereumEventConfiguration = await freeton
    .requireContract(tonWrapper, 'EthereumEventConfiguration');
  const EthereumEvent = await freeton
    .requireContract(tonWrapper, 'EthereumEvent');
  const EventProxy = await freeton
    .requireContract(tonWrapper, 'EventProxy');

  // -- Fix EventProxy nonce to determine it's address
  const eventProxyNonce = freeton.utils.getRandomNonce();

  // -- Derive EventProxy future address
  const eventProxyFutureAddress = await EventProxy.deploy(
    {
      _ethereumEventConfiguration: Bridge.address,
      _ethereumEventCode: EthereumEvent.code,
      _ethereumEventPubKey: `0x${tonWrapper.keys[0].public}`,
    },
    {
      _randomNonce: eventProxyNonce,
    },
    freeton.utils.convertCrystal('10', 'nano'),
    false,
    undefined,
    true,
  );

  // -- Deploy EventConfiguration contracts
  for (const alias of ['valid', 'invalid']) {
    await migration.deploy({
      alias,
      contract: EthereumEventConfiguration,
      constructorParams: {},
      initParams: {
        basicInitData: {
          eventABI: freeton.utils.stringToBytesArray(alias),
          eventRequiredConfirmations: 2,
          eventRequiredRejects: 2,
          eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
          bridgeAddress: Bridge.address,
          eventCode: EthereumEvent.code,
        },
        initData: {
          eventAddress: 0,
          eventBlocksToConfirm: 1,
          proxyAddress: eventProxyFutureAddress,
        },
      },
      initialBalance: freeton.utils.convertCrystal('100', 'nano')
    }).catch(e => console.log(e));

    // --- Specify 'valid' EventConfiguration address in Proxy
    if (alias === 'valid') {
      await migration.deploy({
        contract : EventProxy,
        constructorParams: {
          _ethereumEventConfiguration: EthereumEventConfiguration.address,
          _ethereumEventCode: EthereumEvent.code,
          _ethereumEventPubKey: `0x${tonWrapper.keys[0].public}`,
        },
        initParams: {
          _randomNonce: eventProxyNonce,
        },
        initialBalance: freeton.utils.convertCrystal('10', 'nano'),
      }).catch(e => console.log(e));
    }
  }

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
      basicInitData: {
        eventABI: freeton.utils.stringToBytesArray(''),
        eventRequiredConfirmations: 2,
        eventRequiredRejects: 2,
        eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
        bridgeAddress: Bridge.address,
        eventCode: TonEvent.code,
      },
      initData: {
        eventAddress: Bridge.address,
        proxyAddress: 0,
      }
    },
    initialBalance: freeton.utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  migration.logHistory();
  
  process.exit(0);
})();
