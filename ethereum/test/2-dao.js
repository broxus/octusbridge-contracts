const {
  signReceipt,
  logger,
  expect,
  sortAccounts
} = require('./utils');
const BigNumber = require('bignumber.js');

const _ = require('underscore');


describe('Test DAO', async () => {
  let bridge, owner, initialRelays;
  let dao;
  
  const configuration = {
    requiredSignatures: 5,
  };
  
  it('Setup bridge', async () => {
    [,owner] = await ethers.getSigners();
  
    initialRelays = await Promise.all(_
      .range(configuration.requiredSignatures + 1)
      .map(async () => ethers.Wallet.createRandom())
    );
  
    // Sort accounts by their address low-high
    initialRelays = sortAccounts(initialRelays);
  
    const Bridge = await ethers.getContractFactory("Bridge");
  
    bridge = await upgrades.deployProxy(
      Bridge,
      [
        owner.address,
        configuration,
        initialRelays.map(account => account.address),
      ]
    );
  
    logger.log(`Bridge: ${bridge.address}`);
  });
  
  it('Setup DAO', async () => {
    const DAO = await ethers.getContractFactory("DAO");
  
    dao = await upgrades.deployProxy(
      DAO,
      [
        bridge.address
      ]
    );
    
    logger.log(`DAO: ${dao.address}`);
  });
  
  describe('Update bridge configuration with DAO', async () => {
    it('Transfer bridge ownership to DAO', async () => {
      await bridge.connect(owner).transferOwnership(dao.address);
  
        expect(await bridge.owner())
          .to.be.equal(dao.address, 'Wrong owner');
    });
    
    let payload, signatures;
    
    it('Execute', async function() {
      const newConfiguration = {
        requiredSignatures: 6,
      };

      // Bridge call
      const {
        data: setConfigurationData
      } = await bridge.populateTransaction.setConfiguration(newConfiguration);
      
      // Encode calls
      const actions = web3.eth.abi.encodeParameters(
        [{
          'EthAction[]': {
            'value': 'uint256',
            'target': 'uint160',
            'signature': 'string',
            'data': 'bytes'
          },
        }],
        [
          [
            {
              'value': 0,
              'target': (new BigNumber(bridge.address.toLowerCase())).toString(10),
              'signature': '',
              'data': setConfigurationData
            }
          ]
        ]
      );
      
      payload = web3.eth.abi.encodeParameters(
        [{
          'TONEvent': {
            'eventTransaction': 'uint256',
            'eventTransactionLt': 'uint64',
            'eventTimestamp': 'uint32',
            'eventIndex': 'uint32',
            'eventData': 'bytes',
            'tonEventConfigurationWid': 'int8',
            'tonEventConfigurationAddress': 'uint256',
            'requiredConfirmations': 'uint16',
            'requiredRejects': 'uint16',
            'proxy': 'address',
            'round': 'uint32',
            'chainId': 'uint32',
          }
        }],
        [{
          'eventTransaction': 0,
          'eventTransactionLt': 0,
          'eventTimestamp': 0,
          'eventIndex': 0,
          'eventData': actions,
          'tonEventConfigurationWid': 0,
          'tonEventConfigurationAddress': 0,
          'requiredConfirmations': 1,
          'requiredRejects': 1,
          'proxy': dao.address,
          'round': 0,
          'chainId': 1,
        }]
      );
  
      signatures = await Promise.all(initialRelays
        .map(async (account) => signReceipt(web3, payload, account)));
  
      await dao.execute(payload, signatures);
  
      const configuration = await bridge.configuration();
  
      expect(configuration)
        .to.be.equal(newConfiguration.requiredSignatures, 'Wrong configuration');
    });
    
    it('Try to execute the same payload', async () => {
      expect(dao.execute(payload, signatures))
        .to.be.revertedWith('DAO: already executed');
    });
  });
  
  describe('Set new bridge address', async () => {
    it('Execute', async () => {
      const {
        address: newBridge
      } = await ethers.Wallet.createRandom();
      
      const {
        data: updateBridgeData
      } = await dao.populateTransaction.updateBridge(newBridge);
  
      // Encode calls
      const actions = web3.eth.abi.encodeParameters(
        [{
          'EthAction[]': {
            'value': 'uint256',
            'target': 'uint160',
            'signature': 'string',
            'data': 'bytes'
          },
        }],
        [
          [
            {
              'value': 0,
              'target': (new BigNumber(dao.address.toLowerCase())).toString(10),
              'signature': '',
              'data': updateBridgeData
            }
          ]
        ]
      );
  
      const payload = web3.eth.abi.encodeParameters(
        [{
          'TONEvent': {
            'eventTransaction': 'uint256',
            'eventTransactionLt': 'uint64',
            'eventTimestamp': 'uint32',
            'eventIndex': 'uint32',
            'eventData': 'bytes',
            'tonEventConfigurationWid': 'int8',
            'tonEventConfigurationAddress': 'uint256',
            'requiredConfirmations': 'uint16',
            'requiredRejects': 'uint16',
            'proxy': 'address',
            'round': 'uint32',
            'chainId': 'uint32',
          }
        }],
        [{
          'eventTransaction': 0,
          'eventTransactionLt': 0,
          'eventTimestamp': 0,
          'eventIndex': 0,
          'eventData': actions,
          'tonEventConfigurationWid': 0,
          'tonEventConfigurationAddress': 0,
          'requiredConfirmations': 1,
          'requiredRejects': 1,
          'proxy': dao.address,
          'round': 0,
          'chainId': 1,
        }]
      );
  
      const signatures = await Promise.all(initialRelays
        .map(async (account) => signReceipt(web3, payload, account)));
  
      await dao.execute(payload, signatures);

      expect(await dao.bridge())
        .to.be.equal(newBridge, 'Wrong new bridge address');
    });
  });
});
