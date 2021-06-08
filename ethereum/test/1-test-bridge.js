// const { expect } = require('chai');
const utils = require('./utils');
const _ = require('underscore');
const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');

const chai = require('chai');
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

const { expect } = chai;


const sortAccounts = (accounts) => accounts
  .sort((a, b) => b.address.toLowerCase() > a.address.toLowerCase() ? -1 : 1);


describe('Test bridge', async function() {
  let bridge, owner, initialRelays;

  const configuration = {
    requiredSignatures: 5,
  };
  
  describe('Setup bridge', async () => {
    it('Deploy bridge', async () => {
      [,owner] = await ethers.getSigners();

      initialRelays = await Promise.all(
        _.range(configuration.requiredSignatures + 1).map(async () => ethers.Wallet.createRandom())
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
    
    it('Check ownership', async () => {
      expect(await bridge.owner())
        .to.be.equal(owner.address, 'Wrong owner');
    });
  });
  
  describe('Set round relays', async () => {
    let newRelays;
    
    it('Setup payload & signatures', async () => {
      newRelays = await Promise.all(
        _.range(configuration.requiredSignatures + 1).map(async () => ethers.Wallet.createRandom())
      );

      const eventData = web3.eth.abi.encodeParameters(
        ['uint32', 'address[]'],
        [1, newRelays.map(a => a.address)],
      );
  
      const tonEvent = web3.eth.abi.encodeParameters(
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
            'round': 'uint32'
          }
        }],
        [{
          'eventTransaction': 0,
          'eventTransactionLt': 0,
          'eventTimestamp': 0,
          'eventIndex': 0,
          'eventData': eventData,
          'tonEventConfigurationWid': 0,
          'tonEventConfigurationAddress': 0,
          'requiredConfirmations': 1,
          'requiredRejects': 1,
          'proxy': bridge.address,
          'round': 0
        }]
      );
  
      const signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(web3, tonEvent, account)));
      
      await expect(bridge.setRoundRelays(tonEvent, signatures))
        .to.emit(bridge, 'RoundRelays')
        .withArgs(1, newRelays.map(a => a.address));
    });
    
    it('Set relays with wrong signatures sequence', async () => {
    
    });
    
    it('Set relays with duplicating signers', async () => {
    
    });
    
    it('Set relays with not enough signatures', async () => {
    
    });
  });
  
  describe('Set configuration', async () => {
    const newConfiguration = {
      requiredSignatures: 6,
    };
    
    it('Update configuration', async () => {
      await bridge.connect(owner)
        .setConfiguration(newConfiguration);
    });
    
    it('Check new configuration', async () => {
      const configuration = await bridge.configuration();

      expect(configuration)
        .to.be.equal(newConfiguration.requiredSignatures, 'Wrong configuration');
    });
    
    it('Update configuration with non-owner', async () => {
      await expect(bridge.setConfiguration(newConfiguration))
        .to.be.revertedWith('Ownable: not owner');
    });
  });
});
