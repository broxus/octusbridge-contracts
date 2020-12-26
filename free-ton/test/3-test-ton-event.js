require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('freeton-truffle');
const _ = require('underscore');
const utils = require('freeton-truffle/utils');


let Bridge;
let TonEventConfiguration;
let TonEvent;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
});


describe('Test TON event', async function() {
  this.timeout(12000000);
  
  before(async function() {
    await tonWrapper.setup();
    
    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
    
    TonEventConfiguration = await freeton
      .requireContract(tonWrapper, 'TonEventConfiguration');
    await TonEventConfiguration.loadMigration();
    
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`TON event configuration address: ${TonEventConfiguration.address}`);
  });
  
  describe('Confirm event', async function() {
    it('Initialize event', async function() {
      eventParams = {
        eventTransaction: 1,
        eventIndex: 1,
        eventData: '',
        eventBlockNumber: 1,
        eventBlock: 1,
        eventDataSignature: utils.stringToBytesArray(''),
        eventConfiguration: TonEventConfiguration.address
      };
      
      await Bridge.run('confirmTonEvent', eventParams).catch(e => console.log(e));
      
      const {
        output: {
          addr: tonEventAddress,
        }
      } = (await TonEventConfiguration.getEvents('EventConfirmation')).pop();
      
      logger.log(`Event address: ${tonEventAddress}`);
      
      TonEvent = await freeton.requireContract(
        tonWrapper,
        'TonEvent',
        tonEventAddress
      );
      
      const details = await TonEvent.runLocal('getDetails', {});
      
      expect(details._eventTransaction.toNumber()).to.equal(eventParams.eventTransaction, 'Wrong event transaction');
      expect(details._eventIndex.toNumber()).to.equal(eventParams.eventIndex, 'Wrong event index');
      expect(details._eventBlockNumber.toNumber()).to.equal(eventParams.eventBlockNumber, 'Wrong block number');
      expect(details._eventBlock.toNumber()).to.equal(eventParams.eventBlock, 'Wrong block');

      expect(details._confirmKeys).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys).to.have.lengthOf(0, 'Wrong amount of rejects');
    });
    
    it('Try to confirm event with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();

      await utils.catchRunFail(
        Bridge.run('confirmTonEvent', eventParams, arbitraryKeyPair),
        303
      );
    });
    
    it('Confirm event enough times', async function() {
      const {
        _requiredConfirmations
      } = await TonEvent.runLocal('getDetails');

      for (const keyId of _.range(1, _requiredConfirmations.toNumber())) {
        await Bridge.run('confirmTonEvent', eventParams, tonWrapper.keys[keyId]);
      }

      const details = await TonEvent.runLocal('getDetails', {});

      expect(details._confirmKeys).to.have.lengthOf(_requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(_requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._rejectKeys).to.have.lengthOf(0, 'Wrong amount of rejects');
      expect((await tonWrapper.getBalance(TonEvent.address)).toNumber()).to.equal(0, 'Wrong balance');
    });
  });
  
  describe('Reject event', async function() {
    it('Initialize event', async function() {
      eventParams = {
        eventTransaction: 2,
        eventIndex: 1,
        eventData: '',
        eventBlockNumber: 1,
        eventBlock: 1,
        eventDataSignature: utils.stringToBytesArray(''),
        eventConfiguration: TonEventConfiguration.address
      };

      await Bridge.run('confirmTonEvent', eventParams).catch(e => console.log(e));

      const {
        output: {
          addr: tonEventAddress,
        }
      } = (await TonEventConfiguration.getEvents('EventConfirmation')).pop();

      logger.log(`Event address: ${tonEventAddress}`);

      TonEvent = await freeton.requireContract(
        tonWrapper,
        'TonEvent',
        tonEventAddress
      );

      const details = await TonEvent.runLocal('getDetails', {});
  
      expect(details._eventTransaction.toNumber()).to.equal(eventParams.eventTransaction, 'Wrong event transaction');
      expect(details._eventIndex.toNumber()).to.equal(eventParams.eventIndex, 'Wrong event index');
      expect(details._eventBlockNumber.toNumber()).to.equal(eventParams.eventBlockNumber, 'Wrong block number');
      expect(details._eventBlock.toNumber()).to.equal(eventParams.eventBlock, 'Wrong block');
  
      expect(details._confirmKeys).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys).to.have.lengthOf(0, 'Wrong amount of rejects');
    });

    it('Try to reject event with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();

      delete eventParams.eventDataSignature;
      
      await utils.catchRunFail(
        Bridge.run('rejectTonEvent', eventParams, arbitraryKeyPair),
        303
      );
    });

    it('Reject event enough times', async function() {
      const {
        _requiredRejects
      } = await TonEvent.runLocal('getDetails');

      for (const keyId of _.range(1, _requiredRejects.toNumber() + 1)) {
        await Bridge.run('rejectTonEvent', eventParams, tonWrapper.keys[keyId]);
      }

      const details = await TonEvent.runLocal('getDetails', {});

      expect(details._confirmKeys).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys).to.have.lengthOf(_requiredRejects.toNumber(), 'Wrong amount of rejects');
      expect((await tonWrapper.getBalance(TonEvent.address)).toNumber()).to.equal(0, 'Wrong balance');
    });
  });
});
