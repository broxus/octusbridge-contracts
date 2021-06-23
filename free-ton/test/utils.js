const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const chai = require('chai');
chai.use(require('chai-bignumber')());

const { expect } = chai;


const logContract = async (contract) => {
  const balance = await locklift.ton.getBalance(contract.address);

  logger.log(`${contract.name} (${contract.address}) - ${locklift.utils.convertCrystal(balance, 'ton')}`);
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Due to the network lag, graphql may not catch wallets updates instantly
const afterRun = async (tx) => {
  if (locklift.network === 'dev' || locklift.network === 'prod') {
    await sleep(100000);
  }
};


class MetricManager {
  constructor(...contracts) {
    this.contracts = contracts;
    this.checkpoints = {};
  }
  
  lastCheckPointName() {
    return Object.keys(this.checkpoints).pop();
  }
  
  async checkPoint(name) {
    const balances = await Promise.all(this.contracts.map(async (contract) =>
      locklift.ton.getBalance(contract.address)));
    
    this.checkpoints[name] = balances;
  }
  
  getCheckPoint(name) {
    const checkpoint = this.checkpoints[name];
    
    if (!checkpoint) throw new Error(`No checkpoint "${name}"`);
    
    return checkpoint;
  }
  
  async getDifference(startCheckPointName, endCheckPointName) {
    const startCheckPoint = this.getCheckPoint(startCheckPointName);
    const endCheckPoint = this.getCheckPoint(endCheckPointName);
    
    const difference = {};
    
    for (const [startMetric, endMetric, contract] of _.zip(startCheckPoint, endCheckPoint, this.contracts)) {
      difference[contract.name] = endMetric - startMetric;
    }
    
    return difference;
  }
  
  addContract(contract, fill=0) {
    this.contracts.push(contract);
    
    for (const checkpoint of Object.keys(this.checkpoints)) {
      this.checkpoints[checkpoint].push(fill);
    }
  }
}


const setupBridge = async (relays) => {
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
  }, locklift.utils.convertCrystal(3, 'nano'));
  
  owner.setKeyPair(keyPair);
  owner.afterRun = afterRun;
  owner.name = 'Bridge owner';
  
  await logContract(owner);
  
  const StakingMockup = await locklift.factory.getContract('StakingMockup');
  
  const staking = await locklift.giver.deployContract({
    contract: StakingMockup,
    constructorParams: {},
    initParams: {
      _randomNonce,
      __keys: relays.map(r => `0x${r.public}`),
    },
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'));
  
  await logContract(staking);
  
  const Bridge = await locklift.factory.getContract('Bridge');
  
  const bridge = await locklift.giver.deployContract({
    contract: Bridge,
    constructorParams: {
      _owner: owner.address,
      _bridgeConfiguration: {
        active: true,
        staking: staking.address,
      }
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));
  

  await logContract(bridge);
  
  const CellEncoder = await locklift.factory.getContract('CellEncoderStandalone');
  
  const cellEncoder = await locklift.giver.deployContract({
    contract: CellEncoder,
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'));
  
  return [bridge, owner, staking, cellEncoder];
};


const setupEthereumEventConfiguration = async (owner, staking, cellEncoder) => {
  const [keyPair] = await locklift.keys.getKeyPairs();
  
  const configurationMeta = await cellEncoder.call({
    method: 'encodeConfigurationMeta',
    params: {
      rootToken: locklift.utils.zeroAddress,
    }
  });

  const _randomNonce = locklift.utils.getRandomNonce();
  
  const ProxyMockup = await locklift.factory.getContract('ProxyMockup');
  
  const {
    address: proxyFutureAddress
  } = await locklift.ton.createDeployMessage({
    contract: ProxyMockup,
    constructorParams: {
      _configuration: locklift.utils.zeroAddress,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  });
  
  const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
  const EthereumEvent = await locklift.factory.getContract('EthereumEvent');
  
  const ethereumEventConfiguration = await locklift.giver.deployContract({
    contract: EthereumEventConfiguration,
    constructorParams: {
      _owner: owner.address,
    },
    initParams: {
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: EthereumEvent.code,
        meta: configurationMeta
      },
      networkConfiguration: {
        eventEmitter: new BigNumber(0),
        eventBlocksToConfirm: 1,
        proxy: proxyFutureAddress,
        startBlockNumber: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(ethereumEventConfiguration);
  
  const proxy = await locklift.giver.deployContract({
    contract: ProxyMockup,
    constructorParams: {
      _configuration: ethereumEventConfiguration.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(proxy);
  
  const Account = await locklift.factory.getAccount('Wallet');
  
  const initializer = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(5, 'nano'));
  
  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';
  
  await logContract(initializer);
  
  return [ethereumEventConfiguration, proxy, initializer];
};


const setupTonEventConfiguration = async (owner, staking, cellEncoder) => {
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
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: TonEvent.code,
        meta: configurationMeta
      },
      networkConfiguration: {
        eventEmitter: locklift.utils.zeroAddress,
        proxy: new BigNumber(0),
        startTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));
  
  await logContract(tonEventConfiguration);
  
  const Account = await locklift.factory.getAccount('Wallet');
  
  const initializer = await locklift.giver.deployContract({
    contract: Account,
    keyPair,
    constructorParams: {},
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
  }, locklift.utils.convertCrystal(5, 'nano'));
  
  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';
  
  await logContract(initializer);
  
  return [tonEventConfiguration, initializer];
};


const setupRelays = async (amount=20) => {
  return Promise.all(_
    .range(amount)
    .map(async () => locklift.ton.client.crypto.generate_random_sign_keys())
  );
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
  MetricManager,
  enableEventConfiguration,
  afterRun,
  logger,
  expect,
};
