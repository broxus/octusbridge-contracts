require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('freeton-truffle');
const _ = require('underscore');
const utils = require('freeton-truffle/utils');


let Bridge;
let EthereumEventConfiguration;
let TonEventConfiguration;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
});


describe('Test event configurations', function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();

    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
  
    EthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await EthereumEventConfiguration.loadMigration();
  
    TonEventConfiguration = await freeton
      .requireContract(tonWrapper, 'TonEventConfiguration');
    await TonEventConfiguration.loadMigration();
  
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`Ethereum event configuration address: ${EthereumEventConfiguration.address}`);
    logger.log(`TON event configuration address: ${TonEventConfiguration.address}`);
  });

  describe('Confirm Ethereum event configuration', async function() {
    it('Check initial state', async function() {
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: EthereumEventConfiguration.address,
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
      expect(status).to.equal(false, 'Wrong status');
    });
    
    it('Vote enough times for reject', async function() {
      const {
        eventConfigurationRequiredRejects,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(eventConfigurationRequiredRejects.toString())) {
        await Bridge.run('updateEventConfiguration', {
          eventConfiguration: EthereumEventConfiguration.address,
          vote: false,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: EthereumEventConfiguration.address,
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty rejects');
      expect(rejectKeys).to.have.lengthOf(
        eventConfigurationRequiredRejects.toString(),
        'Wrong amount of rejects'
      );
      expect(status).to.equal(false, 'Wrong status');
    });
  
    it('Vote enough times for confirmation', async function() {
      const {
        eventConfigurationRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
    
      for (const keyId of _.range(eventConfigurationRequiredConfirmations.toString())) {
        await Bridge.run('updateEventConfiguration', {
          eventConfiguration: EthereumEventConfiguration.address,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
    
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: EthereumEventConfiguration.address,
      });
    
      expect(confirmKeys).to.have.lengthOf(
        eventConfigurationRequiredConfirmations.toString(),
        'Wrong amount of confirmations'
      );
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
      expect(status).to.equal(true, 'Wrong status');
    });
    
    it('Try to vote with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();
  
      await utils.catchRunFail(
        Bridge.run('updateEventConfiguration', {
          eventConfiguration: EthereumEventConfiguration.address,
          vote: true,
        }, arbitraryKeyPair),
        303
      );
    });
  });
  
  describe('Confirm TON event configuration', async function() {
    it('Vote enough times for confirmation', async function() {
      const {
        eventConfigurationRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(eventConfigurationRequiredConfirmations.toString())) {
        await Bridge.run('updateEventConfiguration', {
          eventConfiguration: TonEventConfiguration.address,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: TonEventConfiguration.address,
      });
  
      expect(confirmKeys).to.have.lengthOf(
        eventConfigurationRequiredConfirmations.toString(),
        'Wrong amount of confirmations'
      );
      expect(rejectKeys).to.have.lengthOf(0, 'Non-empty rejects');
      expect(status).to.equal(true, 'Wrong status');
    });
  });
});
