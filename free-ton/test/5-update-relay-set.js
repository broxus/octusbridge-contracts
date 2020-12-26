require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('freeton-truffle');
const _ = require('underscore');
const utils = require('freeton-truffle/utils');


let Bridge;
let key;
let target;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
});


describe('Test Bridge relay update', async function() {
  this.timeout(12000000);
  
  before(async function() {
    await tonWrapper.setup();
    
    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
    
    logger.log(`Bridge address: ${Bridge.address}`);
  
    key = await tonWrapper.ton.crypto.ed25519Keypair();
  });
  
  describe('Grant ownership', async function() {
    it('Initial check', async () => {
      target = {
        key: `0x${key.public}`,
        action: true,
      };
      
      const keyOwnership = await Bridge.runLocal('getKeyStatus', { key: target.key });
      
      expect(keyOwnership).to.equal(false, 'Key should not have ownership');
    });
  
    it('Reject not enough times', async function() {
      const {
        bridgeRelayUpdateRequiredRejects,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(bridgeRelayUpdateRequiredRejects.toNumber() - 1)) {
        await Bridge.run('updateBridgeRelays', {
          target,
          _vote: {
            signature: utils.stringToBytesArray(''),
            payload: utils.stringToBytesArray(''),
          },
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectKeys)
        .to
        .have
        .lengthOf(bridgeRelayUpdateRequiredRejects.toNumber() - 1, 'Wrong amount of confirmations');
    });
  
    it('Confirm enough times', async function() {
      const {
        bridgeRelayUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
      
      for (const keyId of _.range(bridgeRelayUpdateRequiredConfirmations.toNumber())) {
        await Bridge.run('updateBridgeRelays', {
          target,
          _vote: {
            signature: utils.stringToBytesArray('123'),
            payload: utils.stringToBytesArray('123'),
          },
        }, tonWrapper.keys[keyId]);
      }
      
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Wrong amount of confirmations');
  
      const keyOwnership = await Bridge.runLocal('getKeyStatus', { key: target.key });
  
      expect(keyOwnership).to.equal(true, 'Key should have ownership');
    });
  });
  
  describe('Remove ownership', async function() {
    it('Confirm enough times', async function() {
      target = {
        key: `0x${key.public}`,
        action: false,
      };

      const {
        bridgeRelayUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(bridgeRelayUpdateRequiredConfirmations.toNumber())) {
        await Bridge.run('updateBridgeRelays', {
          target,
          _vote: {
            signature: utils.stringToBytesArray('123'),
            payload: utils.stringToBytesArray('123'),
          },
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Wrong amount of rejects');
  
      const keyOwnership = await Bridge.runLocal('getKeyStatus', { key: target.key });
  
      expect(keyOwnership).to.equal(false, 'Key should have ownership');
    });
  });
});
