const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');


let Bridge;
let TonEventConfiguration;
let TonEvent;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
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
        eventInitData: {
          eventTransaction: 1,
          eventIndex: 1,
          eventData: '',
          eventBlockNumber: 1,
          eventBlock: 1,
          tonEventConfiguration: TonEventConfiguration.address,
          requiredConfirmations: 0,
          requiredRejects: 0,
        },
        eventDataSignature: freeton.utils.stringToBytesArray(''),
        configurationID: 333
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
      
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(eventParams.eventInitData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventInitData.eventIndex, 'Wrong event index');
      expect(details._initData.eventBlockNumber.toNumber())
        .to
        .equal(eventParams.eventInitData.eventBlockNumber, 'Wrong block number');
      expect(details._initData.eventBlock.toNumber())
        .to
        .equal(eventParams.eventInitData.eventBlock, 'Wrong block');
  
      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status');
      expect(details._confirmKeys)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures)
        .to
        .have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
    });
    
    it('Try to confirm event with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();

      await freeton.utils.catchRunFail(
        Bridge.run('confirmTonEvent', eventParams, arbitraryKeyPair),
        5001
      );
    });
    
    it('Confirm event enough times', async function() {
      const {
        _initData: {
          requiredConfirmations,
        }
      } = await TonEvent.runLocal('getDetails');
      
      for (const keyId of _.range(1, requiredConfirmations.toNumber())) {
        await Bridge.run('confirmTonEvent', eventParams, tonWrapper.keys[keyId]).catch(e => console.log(e));
      }

      const details = await TonEvent.runLocal('getDetails', {});
  
      expect(details._status.toNumber()).to.equal(1, 'Wrong status');
      expect(details._confirmKeys).to.have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._rejectKeys).to.have.lengthOf(0, 'Wrong amount of rejects');
      // expect((await tonWrapper.getBalance(TonEvent.address)).toNumber()).to.equal(0, 'Wrong balance');
    });
  });
  
  describe('Reject event', async function() {
    it('Initialize event', async function() {
      eventParams = {
        eventInitData: {
          eventTransaction: 2,
          eventIndex: 1,
          eventData: '',
          eventBlockNumber: 1,
          eventBlock: 1,
          tonEventConfiguration: TonEventConfiguration.address,
          requiredConfirmations: 0,
          requiredRejects: 0,
        },
        eventDataSignature: freeton.utils.stringToBytesArray(''),
        configurationID: 333
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
  
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(eventParams.eventInitData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventInitData.eventIndex, 'Wrong event index');
      expect(details._initData.eventBlockNumber.toNumber())
        .to
        .equal(eventParams.eventInitData.eventBlockNumber, 'Wrong block number');
      expect(details._initData.eventBlock.toNumber())
        .to
        .equal(eventParams.eventInitData.eventBlock, 'Wrong block');
  
      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status');
      expect(details._confirmKeys)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures)
        .to
        .have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
    });

    it('Try to reject event with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();

      delete eventParams.eventDataSignature;
      
      await freeton.utils.catchRunFail(
        Bridge.run('rejectTonEvent', eventParams, arbitraryKeyPair),
        5001
      );
    });

    it('Reject event enough times', async function() {
      const {
        _initData: {
          requiredRejects,
        }
      } = await TonEvent.runLocal('getDetails');

      for (const keyId of _.range(1, requiredRejects.toNumber() + 1)) {
        await Bridge.run('rejectTonEvent', eventParams, tonWrapper.keys[keyId]);
      }

      const details = await TonEvent.runLocal('getDetails', {});
  
      expect(details._status.toNumber()).to.equal(2, 'Wrong status');
      expect(details._confirmKeys).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectKeys).to.have.lengthOf(requiredRejects.toNumber(), 'Wrong amount of rejects');
      // expect((await tonWrapper.getBalance(TonEvent.address)).toNumber()).to.equal(0, 'Wrong balance');
    });
  });
});
