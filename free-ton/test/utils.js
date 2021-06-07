const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');


const logContract = async (contract) => {
  const balance = await locklift.ton.getBalance(contract.address);
  
  logger.log(`${contract.name} (${contract.address}) - ${locklift.utils.convertCrystal(balance, 'ton')}`);
};


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
  owner.name = 'Bridge owner';
  
  await logContract(owner);
  
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
  

  await logContract(bridge);
  
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
  
  await logContract(staking);
  
  const cellEncoder = await locklift.giver.deployContract({
    contract: CellEncoder,
    keyPair,
  });
  
  // await logContract(cellEncoder);
  
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
  
    await logContract(ethereumEventConfiguration);
    
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

    await logContract(proxy);
    
    return [ethereumEventConfiguration, proxy];
};


const setupTonEventConfiguration = async (owner, bridge, cellEncoder) => {
  const TonEventConfiguration = await locklift.factory.getContract('TonEventConfiguration');
  const TonEvent = await locklift.factory.getContract('TonEvent');
  
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const configurationMeta = await cellEncoder.call({
    method: 'encodeConfigurationMeta',
    params: {
      rootToken: locklift.utils.zeroAddress,
    }
  });
  
  const tonEventConfiguration = await locklift.giver.deployContract({
    contract: TonEventConfiguration,
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
        eventCode: TonEvent.code,
        meta: configurationMeta
      },
      initData: {
        eventAddress: locklift.utils.zeroAddress,
        proxyAddress: new BigNumber(0),
        startTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(20, 'nano'));
  
  await logContract(tonEventConfiguration);
  
  return [tonEventConfiguration];
};


const setupRelays = async (amount=3) => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const relays = [];
  
  for (const relayId of _.range(amount)) {
    const Account = await locklift.factory.getAccount('Wallet');
  
    const relay = await locklift.giver.deployContract({
      contract: Account,
      keyPair,
    }, locklift.utils.convertCrystal(50, 'nano'));
    
    relay.setKeyPair(keyPair);
    relay.name = `Relay #${relayId}`;
    
    await logContract(relay);
    
    relays.push(relay);
  }
  
  return relays;
};


const enableEventConfiguration = async (bridgeOwner, bridge, eventConfiguration, network, id=1) => {
  const eventType = { 'ethereum': 0, 'ton': 1 };
  
  return bridgeOwner.runTarget({
    contract: bridge,
    method: 'createEventConfiguration',
    params: {
      id,
      eventConfiguration: {
        addr: eventConfiguration.address,
        status: true,
        _type: eventType[network]
      }
    }
  });
};


module.exports = {
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
  setupRelays,
  logContract,
  enableEventConfiguration,
  logger,
};
