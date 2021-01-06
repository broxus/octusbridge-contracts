require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');


let Bridge;
let ValidEthereumEventConfiguration;
let InvalidEthereumEventConfiguration;
let TonEventConfiguration;

let EthereumEventConfigurationContracts;


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
  
    ValidEthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await ValidEthereumEventConfiguration.loadMigration('valid');

    InvalidEthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await InvalidEthereumEventConfiguration.loadMigration('invalid');

    EthereumEventConfigurationContracts = {
      valid: ValidEthereumEventConfiguration,
      invalid: InvalidEthereumEventConfiguration
    };
  
    TonEventConfiguration = await freeton
      .requireContract(tonWrapper, 'TonEventConfiguration');
    await TonEventConfiguration.loadMigration();
  
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`Valid Ethereum event configuration address: ${ValidEthereumEventConfiguration.address}`);
    logger.log(`Invalid Ethereum event configuration address: ${InvalidEthereumEventConfiguration.address}`);
    logger.log(`Valid TON event configuration address: ${TonEventConfiguration.address}`);
  });

  describe('Confirm Ethereum event configuration', async function() {
    it('Check initial state', async function() {
      for (alias of ['valid', 'invalid']) {
        const {
          confirmKeys,
          rejectKeys,
          status,
        } = await Bridge.runLocal('getEventConfigurationStatus', {
          eventConfiguration: EthereumEventConfigurationContracts[alias].address,
        });
    
        expect(confirmKeys).to.have.lengthOf(0, `Non-empty confirmations for ${alias} configuration`);
        expect(rejectKeys).to.have.lengthOf(0, `Non-empty rejects for ${alias} configuration`);
        expect(status).to.equal(false, `Wrong status for ${alias} configuration`);
      }
    });

    it('Vote enough times for reject', async function() {
      const {
        eventConfigurationRequiredRejects,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(eventConfigurationRequiredRejects.toString())) {
        await Bridge.run('updateEventConfiguration', {
          eventConfiguration: InvalidEthereumEventConfiguration.address,
          vote: false,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: InvalidEthereumEventConfiguration.address,
      });
  
      expect(confirmKeys).to.have.lengthOf(0, 'Non-empty confirmations');
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
          eventConfiguration: ValidEthereumEventConfiguration.address,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
    
      const {
        confirmKeys,
        rejectKeys,
        status,
      } = await Bridge.runLocal('getEventConfigurationStatus', {
        eventConfiguration: ValidEthereumEventConfiguration.address,
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
  
      await freeton.utils.catchRunFail(
        Bridge.run('updateEventConfiguration', {
          eventConfiguration: ValidEthereumEventConfiguration.address,
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
