const { expect } = require('chai');
const utils = require('./utils');

let bridge;


describe('Testing Ethereum bridge', async function() {
  before(async function() {
    const accounts = await ethers.getSigners();
    
    const Bridge = await ethers.getContractFactory("Bridge");

    bridge = await upgrades.deployProxy(
      Bridge,
      [
        accounts.map(a => a.address).slice(0,3),
        accounts[0].address,
        [1, 2],
      ]
    );
  });
  
  describe('Check relay signature validating', async function() {
    it('Check relay signature valid', async function() {
      const accounts = await ethers.getSigners();
    
      const receipt = '0x121212';
      const signature = await utils.signReceipt(web3, receipt, accounts[0].address);
    
      expect(
        (await bridge.countRelaysSignatures(receipt, [signature])).toNumber()
      ).to.equal(1, "Relay signature dont work");
    });
  
    it('Check non-relay signature is invalid', async function() {
      const accounts = await ethers.getSigners();
    
      const receipt = '0x121212';
      const signature = await utils.signReceipt(web3, receipt, accounts[6].address);
      
      expect(
        (await bridge.countRelaysSignatures(receipt, [signature])).toNumber()
      ).to.equal(0, "Non-relay signature should not work");
    });
  });
  
  describe('Update bridge configuration', async function() {
    const newConfiguration = web3.eth.abi.encodeParameters(
      [{
        'BridgeConfiguration': {
          'nonce': 'uint16',
          'bridgeUpdateRequiredConfirmations': 'uint16',
        }
      }],
      [{
        'nonce': 11,
        'bridgeUpdateRequiredConfirmations': 3,
      }]
    );

    it('Validate initial configuration', async function() {
      const configuration = await bridge.getConfiguration();
      
      expect(configuration.bridgeUpdateRequiredConfirmations)
        .to
        .equal(2, 'Wrong initial required confirmations to update bridge');
    });
    
    it('Check update fail with lack of confirmations', async function() {
      const accounts = await ethers.getSigners();
  
      const signatures = [
        (await utils.signReceipt(web3, newConfiguration, accounts[0].address)),
      ];
  
      await utils.catchRevertWithMessage(
        bridge.updateBridgeConfiguration(newConfiguration, signatures),
        'Not enough confirmations'
      );
    });
    
    it('Update configuration', async function() {
      const accounts = await ethers.getSigners();
  
      const signatures = [
        (await utils.signReceipt(web3, newConfiguration, accounts[0].address)),
        (await utils.signReceipt(web3, newConfiguration, accounts[1].address)),
      ];
  
      await bridge.updateBridgeConfiguration(newConfiguration, signatures);
  
      const configuration = await bridge.getConfiguration();
  
      expect(configuration.bridgeUpdateRequiredConfirmations)
        .to
        .equal(3, 'Wrong new required confirmations to update bridge');
    });
  });
  
  describe('Check updating bridge relays', async function() {
    const relay = '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c';
    
    it('Add relay', async function() {
      const addRelay = web3.eth.abi.encodeParameters(
        [{
          'BridgeRelay': {
            'nonce': 'uint16',
            'account': 'address',
            'action': 'bool'
          }
        }],
        [{
          'nonce': 12,
          'account': relay,
          'action': true
        }]
      );
  
      const accounts = await ethers.getSigners();
  
      const signatures = [
        (await utils.signReceipt(web3, addRelay, accounts[0].address)),
        (await utils.signReceipt(web3, addRelay, accounts[1].address)),
        (await utils.signReceipt(web3, addRelay, accounts[2].address)),
      ];
  
      expect((await bridge.isRelay(relay))).to.equal(false, 'Address should not have relay ownership');
  
      await bridge.updateBridgeRelay(addRelay, signatures);
  
      expect((await bridge.isRelay(relay))).to.equal(true, 'Address should receive relay ownership');
    });
  
    it('Remove relay', async function() {
      const removeRelay = web3.eth.abi.encodeParameters(
        [{
          'BridgeRelay': {
            'nonce': 'uint16',
            'account': 'address',
            'action': 'bool'
          }
        }],
        [{
          'nonce': 13,
          'account': relay,
          'action': false
        }]
      );
  
      const accounts = await ethers.getSigners();
  
      const signatures = [
        (await utils.signReceipt(web3, removeRelay, accounts[0].address)),
        (await utils.signReceipt(web3, removeRelay, accounts[1].address)),
        (await utils.signReceipt(web3, removeRelay, accounts[2].address)),
      ];
  
      expect((await bridge.isRelay(relay))).to.equal(true, 'Address should already have relay ownership');
  
      await bridge.updateBridgeRelay(removeRelay, signatures);
  
      expect((await bridge.isRelay(relay))).to.equal(false, 'Address should loose relay ownership');
    });
    
    it('Try to re-add relay with old payload and signatures', async function() {
      const addRelay = web3.eth.abi.encodeParameters(
        [{
          'BridgeRelay': {
            'nonce': 'uint16',
            'account': 'address',
            'action': 'bool'
          }
        }],
        [{
          'nonce': 12,
          'account': relay,
          'action': true
        }]
      );
  
      const accounts = await ethers.getSigners();
  
      const signatures = [
        (await utils.signReceipt(web3, addRelay, accounts[0].address)),
        (await utils.signReceipt(web3, addRelay, accounts[1].address)),
        (await utils.signReceipt(web3, addRelay, accounts[2].address)),
      ];
  
      await utils.catchRevertWithMessage(
        bridge.updateBridgeRelay(addRelay, signatures),
        'Nonce already used'
      );
    });
  });
});
