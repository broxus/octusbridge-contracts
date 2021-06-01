const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');


const setupBridge = async () => {
  const Bridge = await locklift.factory.getContract('Bridge');
  const CellEncoder = await locklift.factory.getContract('CellEncoderStandalone');

  const Account = await locklift.factory.getAccount('Wallet');
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const _randomNonce = locklift.utils.getRandomNonce();
  
  const owner = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(30, 'nano'));
  
  owner.setKeyPair(keyPair);
  
  logger.log(`Bridge owner: ${owner.address}`);
  
  const StakingMockup = await locklift.factory.getContract('StakingMockup');

  // Staking requires bridge address on deployment and vice versa
  // 1. Derive future staking address
  // 2. Deploy bridge with derived staking address
  // 3. Deploy staking, so it's available on the derived address
  
  const {
    address: stakingFutureAddress
  } = await locklift.ton.createDeployMessage({
    contract: StakingMockup,
    constructorParams: {
      _bridge: locklift.utils.zeroAddress,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  });
  
  const bridge = await locklift.giver.deployContract({
    contract: Bridge,
    constructorParams: {
      _owner: owner.address,
      _bridgeConfiguration: {
        active: true,
        staking: stakingFutureAddress,
      }
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair
  }, locklift.utils.convertCrystal(10, 'nano'));
  
  logger.log(`Bridge: ${bridge.address}`);
  
  const staking = await locklift.giver.deployContract({
    contract: StakingMockup,
    constructorParams: {
      _bridge: bridge.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(10, 'nano'));
  
  logger.log(`Staking: ${staking.address}`);
  
  const cellEncoder = await locklift.giver.deployContract({
    contract: CellEncoder,
    keyPair,
  });
  
  logger.log(`Cell encoder: ${cellEncoder.address}`);
  
  return [bridge, owner, staking, cellEncoder];
};


const setupEthereumEventConfiguration = async (owner, bridge, cellEncoder) => {
    const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
    const EthereumEvent = await locklift.factory.getContract('EthereumEvent');
    const ProxyMockup = await locklift.factory.getContract('ProxyMockup');
  
    const [keyPair] = await locklift.keys.getKeyPairs();
    
    const configurationMeta = await cellEncoder.call({
      method: 'encodeConfigurationMeta',
      params: {
        rootToken: locklift.utils.zeroAddress,
      }
    });
  
    const _randomNonce = locklift.utils.getRandomNonce();
    
    const {
      address: proxyFutureAddress
    } = await locklift.ton.createDeployMessage({
      contract: ProxyMockup,
      constructorParams: {
        _ethereumEventConfiguration: locklift.utils.zeroAddress,
      },
      initParams: {
        _randomNonce,
      },
      keyPair
    });
    
    const ethereumEventConfiguration = await locklift.giver.deployContract({
      contract: EthereumEventConfiguration,
      constructorParams: {
        _owner: owner.address,
      },
      initParams: {
        basicInitData: {
          eventABI: '',
          eventRequiredConfirmations: 2,
          eventRequiredRejects: 2,
          eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
          bridgeAddress: bridge.address,
          eventCode: EthereumEvent.code,
          meta: configurationMeta
        },
        initData: {
          eventAddress: new BigNumber(0),
          eventBlocksToConfirm: 1,
          proxyAddress: proxyFutureAddress,
          startBlockNumber: 0,
        }
      },
      keyPair
    }, locklift.utils.convertCrystal(20, 'nano'));
  
    logger.log(`Ethereum event configuration: ${ethereumEventConfiguration.address}`);
    
    const proxy = await locklift.giver.deployContract({
      contract: ProxyMockup,
      constructorParams: {
        _ethereumEventConfiguration: ethereumEventConfiguration.address,
      },
      initParams: {
        _randomNonce,
      },
      keyPair
    }, locklift.utils.convertCrystal(10, 'nano'));

    logger.log(`Proxy: ${proxy.address}`);
    
    return [ethereumEventConfiguration, proxy];
};


const setupRelays = async (amount=3) => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const relays = [];
  
  for (const relayId of _.range(amount)) {
    const Account = await locklift.factory.getAccount('Wallet');
  
    const relay = await locklift.giver.deployContract({
      contract: Account,
      keyPair,
    }, locklift.utils.convertCrystal(10, 'nano'));
    
    relay.setKeyPair(keyPair);
  
    logger.log(`Relay ${relayId}: ${relay.address}`);
    
    relays.push(relay);
  }
  
  return relays;
};


module.exports = {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
  logger,
};
