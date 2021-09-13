const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const chai = require('chai');
chai.use(require('chai-bignumber')());

const { expect } = chai;

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/free-ton/build';

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
  }, locklift.utils.convertCrystal(1000, 'nano'));
  
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
  const Connector = await locklift.factory.getContract('Connector');
  
  const bridge = await locklift.giver.deployContract({
    contract: Bridge,
    constructorParams: {
      _owner: owner.address,
      _staking: staking.address,
      _connectorCode: Connector.code,
      _connectorDeployValue: locklift.utils.convertCrystal(1, 'nano'),
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
  
  const configurationMeta = '';

  const _randomNonce = locklift.utils.getRandomNonce();

  const Proxy = await locklift.factory.getContract('ProxyTokenTransfer');

  const {
    address: proxyFutureAddress
  } = await locklift.ton.createDeployMessage({
    contract: Proxy,
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  });

  const [tokenRoot, wallet] = await setupTokenRootWithWallet(
    proxyFutureAddress,
    owner.address,
    locklift.utils.convertCrystal('100', 'nano')
  );

  const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
  const EthereumEvent = await locklift.factory.getContract('TokenTransferEthereumEvent');

  const ethereumEventConfiguration = await locklift.giver.deployContract({
    contract: EthereumEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: configurationMeta,
    },
    initParams: {
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: EthereumEvent.code,
      },
      networkConfiguration: {
        chainId: 1,
        eventEmitter: new BigNumber(0),
        eventBlocksToConfirm: 1,
        proxy: proxyFutureAddress,
        startBlockNumber: 0,
        endBlockNumber: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(ethereumEventConfiguration);

  const proxy = await locklift.giver.deployContract({
    contract: Proxy,
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(proxy);

  const proxyConfiguration = {
    tonConfiguration:  locklift.utils.zeroAddress,
    ethereumConfigurations: [ethereumEventConfiguration.address],
    outdatedTokenRoots: [],
    tokenRoot: tokenRoot.address,
    settingsDeployWalletGrams: locklift.utils.convertCrystal(0.1, 'nano')
  }

  await owner.runTarget({
    contract: proxy,
    method: 'setConfiguration',
    params: {
      _config: proxyConfiguration,
      gasBackAddress: owner.address
    },
    value: locklift.utils.convertCrystal(0.5, 'nano')
  });

  const Account = await locklift.factory.getAccount('Wallet');

  const initializer = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(10, 'nano'));

  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';

  await logContract(initializer);

  return [ethereumEventConfiguration, proxy, initializer];
};

const setupTokenRootWithWallet = async (rootOwner, walletOwner, mintAmount) => {
  const RootToken = await locklift.factory.getContract('RootTokenContract', TOKEN_PATH);
  const tokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
  const [keyPair] = await locklift.keys.getKeyPairs();

  const root = await locklift.giver.deployContract({
    contract: RootToken,
    constructorParams: {
      root_public_key_: `0x${keyPair.public}`,
      root_owner_address_: locklift.utils.zeroAddress
    },
    initParams: {
      name: Buffer.from('TKN').toString('hex'),
      symbol: Buffer.from('TKN').toString('hex'),
      decimals: 9,
      wallet_code: tokenWallet.code,
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    keyPair,
  }, locklift.utils.convertCrystal(2, 'nano'));
  root.afterRun = afterRun;
  root.setKeyPair(keyPair);

  const tx = await root.run({
    method: 'deployWallet',
    params: {
      deploy_grams: locklift.utils.convertCrystal(1, 'nano'),
      wallet_public_key_: 0,
      owner_address_: walletOwner,
      gas_back_address: root.address,
      tokens: mintAmount
    },
  });
  tokenWallet.setAddress(tx.decoded.output.value0);
  tokenWallet.afterRun = afterRun;

  await root.run({
    method: 'transferOwner',
    params: {
      root_public_key_: 0,
      root_owner_address_: rootOwner
    }
  });

  await logContract(root);

  return [root, tokenWallet];
}

const setupTonEventConfiguration = async (owner, staking, cellEncoder) => {
  const TonEventConfiguration = await locklift.factory.getContract('TonEventConfiguration');
  const TonEvent = await locklift.factory.getContract('TokenTransferTonEvent');

  const _randomNonce = locklift.utils.getRandomNonce();
  const [keyPair] = await locklift.keys.getKeyPairs();

  const Proxy = await locklift.factory.getContract('ProxyTokenTransfer');

  const {
    address: proxyFutureAddress
  } = await locklift.ton.createDeployMessage({
    contract: Proxy,
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  });

  const Account = await locklift.factory.getAccount('Wallet');

  const initializer = await locklift.giver.deployContract({
    contract: Account,
    keyPair,
    constructorParams: {},
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
  }, locklift.utils.convertCrystal(6, 'nano'));

  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';

  await logContract(initializer);

  const [tokenRoot, initializerWallet] = await setupTokenRootWithWallet(
    proxyFutureAddress,
    initializer.address,
    locklift.utils.convertCrystal('100', 'nano')
  );

  const configurationMeta = '';
  const tonEventConfiguration = await locklift.giver.deployContract({
    contract: TonEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: configurationMeta,
    },
    initParams: {
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: TonEvent.code,
      },
      networkConfiguration: {
        eventEmitter: proxyFutureAddress,
        proxy: new BigNumber(0),
        startTimestamp: 0,
        endTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(tonEventConfiguration);

  const proxy = await locklift.giver.deployContract({
    contract: Proxy,
    constructorParams: {
      owner_: owner.address,
    },
    initParams: {
      _randomNonce,
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(proxy);

  const proxyConfiguration = {
    tonConfiguration: tonEventConfiguration.address,
    ethereumConfigurations: [],
    outdatedTokenRoots: [],
    tokenRoot: tokenRoot.address,
    rootTunnel: tokenRoot.address,
    settingsDeployWalletGrams: locklift.utils.convertCrystal(0.1, 'nano')
  }

  await owner.runTarget({
    contract: proxy,
    method: 'setConfiguration',
    params: {
      _config: proxyConfiguration,
      gasBackAddress: owner.address
    },
    value: locklift.utils.convertCrystal(0.5, 'nano')
  });

  return [tonEventConfiguration, proxy, initializer];
};

const getTokenWalletByAddress = async (walletOwner, rootAddress) => {
  const tokenRoot = await locklift.factory.getContract('RootTokenContract', TOKEN_PATH);
  tokenRoot.setAddress(rootAddress);
  const walletAddress = await tokenRoot.call({
    method: 'getWalletAddress', params: {
      wallet_public_key_: 0,
      owner_address_: walletOwner
    }
  });
  const tokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
  tokenWallet.setAddress(walletAddress);
  tokenWallet.afterRun = afterRun;
  return tokenWallet;
}

const extractTonEventAddress = async (tx) => {
  const result = await locklift.ton.client.net.query_collection({
    collection: 'messages',
    filter: {
      id: {eq: tx.transaction.out_msgs[0]},
    },
    result: 'dst_transaction{out_messages{' +
      'dst_transaction{out_messages{' +
      'dst_transaction{out_messages{' +
      'dst_transaction{out_messages{' +
      'id dst' +
      '}}}}}}}}'
  });
  return result.result[0]
    .dst_transaction.out_messages[0]
    .dst_transaction.out_messages[0]
    .dst_transaction.out_messages[0]
    .dst_transaction.out_messages[0].dst;
}

const setupRelays = async (amount=20) => {
  return Promise.all(_
    .range(amount)
    .map(async () => locklift.ton.client.crypto.generate_random_sign_keys())
  );
};


const enableEventConfiguration = async (bridgeOwner, bridge, eventConfiguration) => {
  const connectorId = await bridge.call({
    method: 'connectorCounter',
  });

  await bridgeOwner.runTarget({
    contract: bridge,
    method: 'deployConnector',
    params: {
      _eventConfiguration: eventConfiguration.address
    },
    value: locklift.utils.convertCrystal(4, 'nano')
  });

  const connectorAddress = await bridge.call({
    method: 'deriveConnectorAddress',
    params: {
      id: connectorId
    }
  });

  const connector = await locklift.factory.getContract('Connector');
  connector.setAddress(connectorAddress);

  await bridgeOwner.runTarget({
    contract: connector,
    method: 'enable',
    params: {}
  });
};


const captureConnectors = async (bridge) => {
  const connectorCounter = await bridge.call({
    method: 'connectorCounter',
  });

  const configurations = await Promise.all(_.range(connectorCounter).map(async (connectorId) => {
    const connectorAddress = await bridge.call({
      method: 'deriveConnectorAddress',
      params: {
        id: connectorId
      }
    });
  
    const connector = await locklift.factory.getContract('Connector');
    connector.setAddress(connectorAddress);
  
    return await connector.call({
      method: 'getDetails'
    });
  }));

  return configurations.reduce((acc, configuration) => {
    return {
      ...acc,
      [configuration._id] : configuration
    }
  }, {});
};


function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }))
}

const isValidTonAddress = (address) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);


const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};


module.exports = {
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
  setupRelays,
  logContract,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  getTokenWalletByAddress,
  extractTonEventAddress,
  afterRun,
  isValidTonAddress,
  stringToBytesArray,
  logger,
  expect,
  TOKEN_PATH
};
