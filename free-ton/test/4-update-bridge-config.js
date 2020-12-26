require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('freeton-truffle');
const _ = require('underscore');
const utils = require('freeton-truffle/utils');


let Bridge;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
});


const newBridgeConfiguration = {
  eventConfigurationRequiredConfirmations: 2,
  eventConfigurationRequiredRejects: 2,
  bridgeConfigurationUpdateRequiredConfirmations: 3,
  bridgeConfigurationUpdateRequiredRejects: 2,
  bridgeRelayUpdateRequiredConfirmations: 10,
  bridgeRelayUpdateRequiredRejects: 5,
  active: true,
};


describe('Test Bridge configuration update', async function() {
  this.timeout(12000000);
  
  before(async function() {
    await tonWrapper.setup();
    
    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
    
    logger.log(`Bridge address: ${Bridge.address}`);
  });
  
  describe('Reject Bridge configuration update', async function() {
    it('Initial check', async () => {
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
    });
    
    it('Confirm not enough times', async function() {
      const {
        bridgeConfigurationUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(bridgeConfigurationUpdateRequiredConfirmations.toNumber() - 1)) {
        await Bridge.run('updateBridgeConfiguration', {
          _bridgeConfiguration: newBridgeConfiguration,
          _vote: {
            signature: utils.stringToBytesArray('123'),
            payload: utils.stringToBytesArray('123')
          },
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });

      expect(confirmKeys).to.have.lengthOf(
        bridgeConfigurationUpdateRequiredConfirmations.toNumber() - 1,
        'Non-empty confirmations'
      );
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
    });
    
    it('Reject enough times', async function() {
      const bridgeConfiguration = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(bridgeConfiguration.bridgeConfigurationUpdateRequiredRejects.toNumber())) {
        await Bridge.run('updateBridgeConfiguration', {
          _bridgeConfiguration: newBridgeConfiguration,
          _vote: {
            signature: utils.stringToBytesArray(''),
            payload: utils.stringToBytesArray('')
          },
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
  
      const _bridgeConfiguration = await Bridge.runLocal('getDetails');

      expect(bridgeConfiguration).to.deep.equal(_bridgeConfiguration, 'Bridge configuration changed');
    });
  });
  
  describe('Confirm Bridge configuration update', async function() {
    it('Confirm enough times', async function() {
      const bridgeConfiguration = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations.toNumber())) {
        await Bridge.run('updateBridgeConfiguration', {
          _bridgeConfiguration: newBridgeConfiguration,
          _vote: {
            signature: utils.stringToBytesArray('123'),
            payload: utils.stringToBytesArray('123')
          },
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
  
      const _bridgeConfiguration = await Bridge.runLocal('getDetails');

      expect(bridgeConfiguration).to.not.deep.equal(_bridgeConfiguration, 'Bridge configuration not changed');
      expect(_bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations.toNumber())
        .to
        .equal(newBridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations, 'Wrong new configuration');
    });
  });
});
