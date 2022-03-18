const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const chai = require('chai');
chai.use(require('chai-bignumber')());

const { expect } = chai;

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/build';

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
      _manager: owner.address,
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
  const RootToken = await locklift.factory.getContract('TokenRoot', TOKEN_PATH);
  const tokenWallet = await locklift.factory.getContract('TokenWallet', TOKEN_PATH);
  const [keyPair] = await locklift.keys.getKeyPairs();

  const root = await locklift.giver.deployContract({
    contract: RootToken,
    constructorParams: {
      initialSupplyTo: rootOwner,
      initialSupply: mintAmount,
      deployWalletValue: locklift.utils.convertCrystal('0.1', 'nano'),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: locklift.utils.zeroAddress
    },
    initParams: {
      deployer_: locklift.utils.zeroAddress,
      randomNonce_: locklift.utils.getRandomNonce(),
      rootOwner_: rootOwner,
      name_: Buffer.from('Token').toString('hex'),
      symbol_: Buffer.from('TKN').toString('hex'),
      decimals_: 9,
      walletCode_: tokenWallet.code,
    },
    keyPair,
  }, locklift.utils.convertCrystal(2, 'nano'));
  root.afterRun = afterRun;
  root.setKeyPair(keyPair);

  await logContract(root);

  const tokenWalletAddress = await root.call({
    method: 'walletOf',
    params: {
      walletOwner: rootOwner
    }
  });

  tokenWallet.setAddress(tokenWalletAddress);

  return [root, tokenWallet];
}

const setupEverscaleEventConfiguration = async (owner, staking, cellEncoder) => {
  const EverscaleEventConfiguration = await locklift.factory.getContract('EverscaleEventConfiguration');
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
    initializer.address,
    initializer.address,
    locklift.utils.convertCrystal('1000', 'nano')
  );

  await initializer.runTarget({
    contract: tokenRoot,
    method: 'transferOwnership',
    params: {
      newOwner: proxyFutureAddress,
      remainingGasTo: initializer.address,
      callbacks: {}
    }
  });

  const configurationMeta = '';
  const everscaleEventConfiguration = await locklift.giver.deployContract({
    contract: EverscaleEventConfiguration,
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

  await logContract(everscaleEventConfiguration);

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
    tonConfiguration: everscaleEventConfiguration.address,
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

  return [everscaleEventConfiguration, proxy, initializer];
};


const setupAlienMultiVault = async (owner, staking, cellEncoder) => {
  const _randomNonce = locklift.utils.getRandomNonce();
  const [keyPair] = await locklift.keys.getKeyPairs();

  // Deploy initializer account
  const Account = await locklift.factory.getAccount('Wallet');
  const initializer = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(20, 'nano'));

  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';

  await logContract(initializer);

  // Deploy proxy
  const Proxy = await locklift.factory.getContract('ProxyMultiVaultAlien');
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

  // Deploy EVM configuration
  const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
  const EthereumEvent = await locklift.factory.getContract('MultiVaultEVMEventAlien');

  const evmEventConfiguration = await locklift.giver.deployContract({
    contract: EthereumEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: '',
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
        proxy: proxy.address,
        startBlockNumber: 0,
        endBlockNumber: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(evmEventConfiguration);

  // Deploy Everscale configuration
  const EverscaleEventConfiguration = await locklift.factory.getContract('EverscaleEventConfiguration');
  const EverscaleEvent = await locklift.factory.getContract('MultiVaultEverscaleEventAlien');

  const everscaleEventConfiguration = await locklift.giver.deployContract({
    contract: EverscaleEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: '',
    },
    initParams: {
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: EverscaleEvent.code,
      },
      networkConfiguration: {
        eventEmitter: proxy.address,
        proxy: new BigNumber(0),
        startTimestamp: 0,
        endTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(everscaleEventConfiguration);

  // Set proxy configuration
  const AlienTokenRoot = await locklift.factory.getContract('TokenRootAlienEVM');
  const AlienTokenWalletUpgradeable = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
  const AlienTokenWalletPlatform = await locklift.factory.getContract('AlienTokenWalletPlatform');

  await owner.runTarget({
    contract: proxy,
    method: 'setConfiguration',
    params: {
      _config: {
        everscaleConfiguration: everscaleEventConfiguration.address,
        evmConfigurations: [evmEventConfiguration.address],
        deployWalletValue: locklift.utils.convertCrystal(1, 'nano'),
        alienTokenRootCode: AlienTokenRoot.code,
        alienTokenWalletCode: AlienTokenWalletUpgradeable.code,
        alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code,
      },
      remainingGasTo: owner.address
    },
    value: locklift.utils.convertCrystal(0.5, 'nano')
  });

  return [evmEventConfiguration, everscaleEventConfiguration, proxy, initializer];
};


const setupNativeMultiVault = async (owner, staking) => {
  const _randomNonce = locklift.utils.getRandomNonce();
  const [keyPair] = await locklift.keys.getKeyPairs();

  // Deploy initializer account
  const Account = await locklift.factory.getAccount('Wallet');
  const initializer = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce,
    },
    keyPair,
  }, locklift.utils.convertCrystal(20, 'nano'));

  initializer.setKeyPair(keyPair);
  initializer.afterRun = afterRun;
  initializer.name = 'Event initializer';

  await logContract(initializer);

  // Deploy proxy
  const Proxy = await locklift.factory.getContract('ProxyMultiVaultNative');
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

  // Deploy EVM configuration
  const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
  const EthereumEvent = await locklift.factory.getContract('MultiVaultEVMEventNative');

  const evmEventConfiguration = await locklift.giver.deployContract({
    contract: EthereumEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: '',
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
        proxy: proxy.address,
        startBlockNumber: 0,
        endBlockNumber: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(evmEventConfiguration);

  // Deploy Everscale configuration
  const EverscaleEventConfiguration = await locklift.factory.getContract('EverscaleEventConfiguration');
  const EverscaleEvent = await locklift.factory.getContract('MultiVaultEverscaleEventNative');

  const everscaleEventConfiguration = await locklift.giver.deployContract({
    contract: EverscaleEventConfiguration,
    constructorParams: {
      _owner: owner.address,
      _meta: '',
    },
    initParams: {
      basicConfiguration: {
        eventABI: '',
        eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
        staking: staking.address,
        eventCode: EverscaleEvent.code,
      },
      networkConfiguration: {
        eventEmitter: proxy.address,
        proxy: new BigNumber(0),
        startTimestamp: 0,
        endTimestamp: 0,
      }
    },
    keyPair
  }, locklift.utils.convertCrystal(1, 'nano'));

  await logContract(everscaleEventConfiguration);

  // Set proxy configuration
  await owner.runTarget({
    contract: proxy,
    method: 'setConfiguration',
    params: {
      _config: {
        everscaleConfiguration: everscaleEventConfiguration.address,
        evmConfigurations: [evmEventConfiguration.address],
        deployWalletValue: locklift.utils.convertCrystal(1, 'nano'),
      },
      remainingGasTo: owner.address
    },
    value: locklift.utils.convertCrystal(0.5, 'nano')
  });

  return [evmEventConfiguration, everscaleEventConfiguration, proxy, initializer];
};


const getTokenWalletByAddress = async (walletOwner, rootAddress) => {
  const tokenRoot = await locklift.factory.getContract('TokenRoot', TOKEN_PATH);
  tokenRoot.setAddress(rootAddress);

  const walletAddress = await tokenRoot.call({
    method: 'walletOf',
    params: {
      walletOwner
    }
  });

  const tokenWallet = await locklift.factory.getContract('TokenWallet', TOKEN_PATH);
  tokenWallet.setAddress(walletAddress);
  tokenWallet.afterRun = afterRun;

  return tokenWallet;
}

const getTokenRoot = async ( rootAddress) => {
  const tokenRoot = await locklift.factory.getContract('TokenRoot', TOKEN_PATH);
  tokenRoot.setAddress(rootAddress);

  return tokenRoot;
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
  
  const connectorDeployValue = await bridge.call({
    method: 'connectorDeployValue',
  });
  
  await bridgeOwner.runTarget({
    contract: bridge,
    method: 'deployConnector',
    params: {
      _eventConfiguration: eventConfiguration.address
    },
    value: connectorDeployValue.plus(1000000000)
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


const wait_acc_deployed = async function (addr) {
  await locklift.ton.client.net.wait_for_collection({
    collection: 'accounts',
    filter: {
      id: { eq: addr },
      balance: { gt: `0x0` }
    },
    result: 'id'
  });
}

const deployTokenRoot = async function (token_name, token_symbol, owner) {
  const RootToken = await locklift.factory.getContract('TokenRoot', TOKEN_PATH);
  const TokenWallet = await locklift.factory.getContract('TokenWallet', TOKEN_PATH);
  const [keyPair] = await locklift.keys.getKeyPairs();

  const _root = await locklift.giver.deployContract({
    contract: RootToken,
    constructorParams: {
      initialSupplyTo: locklift.utils.zeroAddress,
      initialSupply: 0,
      deployWalletValue: 0,
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: owner.address
    },
    initParams: {
      name_: token_name,
      symbol_: token_symbol,
      decimals_: 9,
      rootOwner_: owner.address,
      walletCode_: TokenWallet.code,
      randomNonce_: locklift.utils.getRandomNonce(),
      deployer_: locklift.utils.zeroAddress
    },
    keyPair,
  });

  _root.afterRun = afterRun;
  _root.setKeyPair(keyPair);

  return _root;
}

const deployTokenWallets = async function(users, _root) {
  let wallets = []
  for (const user of users) {
    await user.runTarget({
      contract: _root,
      method: 'deployWallet',
      params: {
        answerId: 0,
        walletOwner: user.address,
        deployWalletValue: locklift.utils.convertCrystal(1, 'nano'),
      },
      value: locklift.utils.convertCrystal(2, 'nano'),
    });

    const walletAddr = await getTokenWalletAddr(_root, user);

    // Wait until user token wallet is presented into the GraphQL
    await wait_acc_deployed(walletAddr);

    logger.log(`User token wallet: ${walletAddr}`);

    let userTokenWallet = await locklift.factory.getContract(
        'TokenWallet',
        TOKEN_PATH
    );

    userTokenWallet.setAddress(walletAddr);
    wallets.push(userTokenWallet);
  }
  return wallets;
}

const sendTokens = async function (user, _userTokenWallet, recipient, amount, payload) {
  return await user.runTarget({
    contract: _userTokenWallet,
    method: 'transfer',
    params: {
      amount: amount,
      recipient: recipient.address,
      deployWalletValue: 0,
      remainingGasTo: user.address,
      notify: true,
      payload: payload
    },
    value: locklift.utils.convertCrystal(11, 'nano')
  });
};


const depositTokens = async function (stakingRoot, user, _userTokenWallet, depositAmount, reward=false) {
  var payload;
  const DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgA=';
  const REWARD_DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgE=';
  if (reward) {
    payload = REWARD_DEPOSIT_PAYLOAD;
  } else {
    payload = DEPOSIT_PAYLOAD;
  }

  return await sendTokens(user, _userTokenWallet, stakingRoot, depositAmount, payload);
};


// mint + deploy
const mintTokens = async function(owner, users, _root, mint_amount) {
  let wallets = [];
  for (const user of users) {
    await owner.runTarget({
      contract: _root,
      method: 'mint',
      params: {
        amount: mint_amount,
        recipient: user.address,
        deployWalletValue: locklift.utils.convertCrystal(1, 'nano'),
        remainingGasTo: owner.address,
        notify: false,
        payload: ''
      },
      value: locklift.utils.convertCrystal(3, 'nano'),
    });

    const walletAddr = await getTokenWalletAddr(_root, user);

    await wait_acc_deployed(walletAddr);

    logger.log(`User token wallet: ${walletAddr}`);

    let userTokenWallet = await locklift.factory.getContract(
        'TokenWallet',
        TOKEN_PATH
    );

    userTokenWallet.setAddress(walletAddr);
    wallets.push(userTokenWallet);
  }
  return wallets;
}

const deployAccount = async function (key, value) {
  const Account = await locklift.factory.getAccount('Wallet');
  let account = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 6400 | 0,
    },
    keyPair: key
  }, locklift.utils.convertCrystal(value, 'nano'));
  account.setKeyPair(key);
  account.afterRun = afterRun;
  await wait_acc_deployed(account.address);
  return account;
}

const getTokenWalletAddr = async function(_root, user) {
  return await _root.call({
    method: 'walletOf',
    params: { walletOwner: user.address }
  });
}


const isValidTonAddress = (address) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);


const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};


module.exports = {
  setupBridge,
  setupEthereumEventConfiguration,
  setupEverscaleEventConfiguration,
  setupTokenRootWithWallet,
  setupRelays,
  setupAlienMultiVault,
  setupNativeMultiVault,
  logContract,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  getTokenRoot,
  getTokenWalletByAddress,
  sendTokens,
  extractTonEventAddress,
  afterRun,
  isValidTonAddress,
  deployTokenRoot,
  deployTokenWallets,
  depositTokens,
  stringToBytesArray,
  getTokenWalletAddr,
  wait_acc_deployed,
  mintTokens,
  deployAccount,
  logger,
  expect,
  TOKEN_PATH
};
