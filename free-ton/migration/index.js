const freeton = require('ton-testing-suite');
const { Wallet } = require('ethers');

const BigNumber = require('bignumber.js');
BigNumber.config({ EXPONENTIAL_AT: 257 });


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
});


// Deploy contracts
(async () => {
  const relaysAmount = parseInt(process.env.RELAYS_AMOUNT);

  await tonWrapper.setup(relaysAmount);
  
  tonWrapper.keys.map((key, i) => console.log(`Key #${i} - ${JSON.stringify(key)}`));

  const migration = new freeton.Migration(tonWrapper);
  
  const Bridge = await freeton
    .requireContract(tonWrapper, 'Bridge');
  
  // Derive Ethereum addresses
  // - Prepare paths
  const paths = [...Array(relaysAmount).keys()].map(i => `m/44'/60'/0'/0/${i}`);
  const ethereumAccounts = paths
    .map(p => Wallet.fromMnemonic(process.env.ETH_SEED, p)) // Convert path to account
    .map(a => new BigNumber(a.address.toLowerCase())); // Convert address to uint
  
  // - Deploy Bridge
  await migration.deploy({
    contract: Bridge,
    constructorParams: {
      _relayKeys: tonWrapper.keys.map((key) => `0x${key.public}`),
      _relayEthereumAccounts: ethereumAccounts,
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
  const EventProxy = await freeton
    .requireContract(tonWrapper, 'EventProxy');

  // -- Fix EventProxy nonce to determine it's address
  const eventProxyNonce = determineDeploy ? 1 : freeton.utils.getRandomNonce();

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
