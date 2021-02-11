const freeton = require('ton-testing-suite');
const { Wallet } = require('ethers');

const BigNumber = require('bignumber.js');
BigNumber.config({ EXPONENTIAL_AT: 257 });
const _ = require('underscore');


// True gives the repeatable migration
const determineDeploy = !!process.env.DETERMINE_DEPLOY;

const giverConfig = {
  address: process.env.TON_GIVER_CONTRACT,
  abi: JSON.parse(process.env.TON_GIVER_ABI),
};

const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
  giverConfig,
  waitForTimeout: 60000,
  debug: Boolean(process.env.TON_WRAPPER_DEBUG),
});


// Deploy contracts
(async () => {
  const relaysAmount = parseInt(process.env.RELAYS_AMOUNT);

  await tonWrapper.setup(relaysAmount);
  
  if (Boolean(process.env.LOG_KEYS)) {
    tonWrapper.keys.map((key, i) => console.log(`Key #${i} - ${JSON.stringify(key)}`));
  }

  const migration = new freeton.Migration(tonWrapper);
  
  
  // Deploy CellEncoder
  const CellEncoder = await freeton
    .requireContract(tonWrapper, 'CellEncoder');
  
  await migration.deploy({
    contract: CellEncoder,
    constructorParams: {},
    initParams: {},
    _randomNonce: true,
    initialBalance: freeton.utils.convertCrystal('1', 'nano'),
  }).catch(e => console.log(e));
  
  // - Deploy relay personal contracts
  const RelayAccount = await freeton
    .requireContract(tonWrapper, 'RelayAccount');

  const relayAccounts = [];

  for (const relayId of _.range(0, relaysAmount)) {
    await migration.deploy({
      contract: RelayAccount,
      constructorParams: {},
      initParams: {},
      initialBalance: freeton.utils.convertCrystal('50', 'nano'),
      _randomNonce: true,
      alias: `Relay_${relayId}`,
      keyPair: tonWrapper.keys[relayId],
    }).catch(e => console.log(e));
    
    relayAccounts.push(RelayAccount.address);
  }
  
  const Bridge = await freeton
    .requireContract(tonWrapper, 'Bridge');
  
  // Derive Ethereum addresses
  // - Prepare paths
  const paths = _.range(0, relaysAmount).map(i => `m/44'/60'/0'/0/${i}`);
  const ethereumAccounts = paths
    .map(p => Wallet.fromMnemonic(process.env.ETH_SEED, p)) // Convert path to account
    .map(a => new BigNumber(a.address.toLowerCase())); // Convert address to uint
  
  // - Deploy Bridge
  await migration.deploy({
    contract: Bridge,
    constructorParams: {
      _relayAccounts: relayAccounts,
      _relayEthereumAccounts: ethereumAccounts,
      _bridgeConfiguration: {
        bridgeUpdateRequiredConfirmations: 2,
        bridgeUpdateRequiredRejects: 2,
        active: true,
        nonce: 1,
      }
    },
    initParams: {
      _randomNonce: determineDeploy ? 1 : freeton.utils.getRandomNonce(),
    },
    initialBalance: freeton.utils.convertCrystal('50', 'nano'),
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
  const EventProxySimple = await freeton
    .requireContract(tonWrapper, 'EventProxySimple');

  // -- Fix EventProxySimple nonce to determine it's address
  const eventProxyNonce = determineDeploy ? 1 : freeton.utils.getRandomNonce();

  // -- Derive EventProxySimple future address
  const eventProxyFutureAddress = await EventProxySimple.getFutureAddress({
    constructorParams: {
      _ethereumEventConfiguration: Bridge.address,
      _ethereumEventCode: EthereumEvent.code,
      _ethereumEventPubKey: `0x${tonWrapper.keys[0].public}`,
    },
    initParams: {
      _randomNonce: eventProxyNonce,
    },
  });
  
  // -- Deploy EthereumEventConfiguration contracts
  // --- Use relay account address as a "root token" in the configuration meta
  const configurationMeta = await CellEncoder.runLocal('encodeConfigurationMeta', {
    rootToken: relayAccounts[0],
  });

  for (const alias of ['valid', 'invalid']) {
    await migration.deploy({
      alias,
      contract: EthereumEventConfiguration,
      constructorParams: {},
      initParams: {
        basicInitData: {
          eventABI: alias === 'valid'
            ? freeton.utils.stringToBytesArray('{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"state","type":"uint256"}],"name":"EthereumStateChange","type":"event"}')
            : freeton.utils.stringToBytesArray(alias),
          eventRequiredConfirmations: 2,
          eventRequiredRejects: 2,
          eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
          bridgeAddress: Bridge.address,
          eventCode: EthereumEvent.code,
          meta: configurationMeta
        },
        initData: {
          eventAddress: new BigNumber('0xc227CE9EdCc60a725DE66A1132171a22ae62a64F'.toLowerCase()),
          eventBlocksToConfirm: 1,
          proxyAddress: eventProxyFutureAddress,
        },
      },
      initialBalance: freeton.utils.convertCrystal('100', 'nano')
    }).catch(e => console.log(e));

    // --- Specify 'valid' EventConfiguration address in Proxy
    if (alias === 'valid') {
      await migration.deploy({
        contract : EventProxySimple,
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

  // Deploy event emitter
  const EventEmitter = await freeton
    .requireContract(tonWrapper, 'EventEmitter');
  await migration.deploy({
    contract: EventEmitter,
    constructorParams: {},
    initParams: {
      _randomNonce: determineDeploy ? 1 : freeton.utils.getRandomNonce(),
    },
    initialBalance: freeton.utils.convertCrystal('5', 'nano'),
  });

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
        eventABI: freeton.utils.stringToBytesArray('{ "name": "TONStateChange", "inputs": [ {"name":"state","type":"uint256"} ], "outputs": [ ] }'),
        eventRequiredConfirmations: 2,
        eventRequiredRejects: 2,
        eventInitialBalance: freeton.utils.convertCrystal('10', 'nano'),
        bridgeAddress: Bridge.address,
        eventCode: TonEvent.code,
        meta: configurationMeta,
      },
      initData: {
        eventAddress: EventEmitter.address,
        proxyAddress: 0,
      }
    },
    initialBalance: freeton.utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  migration.logHistory();
  
  process.exit(0);
})();
