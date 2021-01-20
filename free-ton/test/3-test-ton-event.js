const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');
const utils = require('./utils');


let Bridge;
let TonEventConfiguration;
let TonEvent;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
});

const relaysManager = new utils.RelaysManager(
  parseInt(process.env.RELAYS_AMOUNT),
  tonWrapper,
);


describe('Test TON event', async function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();
    await relaysManager.setup();
    
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
        eventVoteData: {
          eventTransaction: 1,
          eventIndex: 1,
          eventData: '',
          eventTransactionLt: 1,
        },
        eventDataSignature: freeton.utils.stringToBytesArray(''),
        configurationID: 333
      };

      await relaysManager.runTarget({
        contract: Bridge,
        method: 'confirmTonEvent',
        input: eventParams,
      });
      
      const {
        value: {
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
        .equal(eventParams.eventVoteData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventIndex, 'Wrong event index');
      expect(details._initData.eventTransactionLt.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransactionLt, 'Wrong block number');

      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status');
      expect(details._confirmRelays)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures)
        .to
        .have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
    });

    // it('Try to confirm event with non-relay key', async function() {
    //   const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
    //
    //   await freeton.utils.catchRunFail(
    //     Bridge.run('confirmTonEvent', eventParams, arbitraryKeyPair),
    //     5001
    //   );
    // });

    it('Confirm event enough times', async function() {
      const {
        _initData: {
          requiredConfirmations,
        }
      } = await TonEvent.runLocal('getDetails');

      for (const keyId of _.range(1, requiredConfirmations.toNumber())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'confirmTonEvent',
          input: eventParams,
        }, keyId);
      }

      const details = await TonEvent.runLocal('getDetails', {});

      expect(details._status.toNumber()).to.equal(1, 'Wrong status');
      expect(details._confirmRelays).to.have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');
      expect(
        (await tonWrapper.getBalance(TonEvent.address)).toNumber() / 10**9
      ).to.be.greaterThan(0, 'Too low balance')
        .to.be.lessThan(0.5, 'Too high balance');
    });
  });

  describe('Reject event', async function() {
    it('Initialize event', async function() {
      eventParams = {
        eventVoteData: {
          eventTransaction: 2,
          eventIndex: 1,
          eventData: '',
          eventTransactionLt: 1,
        },
        eventDataSignature: freeton.utils.stringToBytesArray(''),
        configurationID: 333
      };

      await relaysManager.runTarget({
        contract: Bridge,
        method: 'confirmTonEvent',
        input: eventParams,
      });
      
      const {
        value: {
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
        .equal(eventParams.eventVoteData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventIndex, 'Wrong event index');
      expect(details._initData.eventTransactionLt.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransactionLt, 'Wrong block number');

      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status');
      expect(details._confirmRelays)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures)
        .to
        .have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
  
      delete eventParams.eventDataSignature;
    });

    // it('Try to reject event with non-relay key', async function() {
    //   const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
    //
    //   await freeton.utils.catchRunFail(
    //     Bridge.run('rejectTonEvent', eventParams, arbitraryKeyPair),
    //     5001
    //   );
    // });

    it('Reject event enough times', async function() {
      const {
        _initData: {
          requiredRejects,
        }
      } = await TonEvent.runLocal('getDetails');

      for (const keyId of _.range(1, requiredRejects.toNumber() + 1)) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'rejectTonEvent',
          input: eventParams,
        }, keyId);
      }

      const details = await TonEvent.runLocal('getDetails', {});

      expect(details._status.toNumber()).to.equal(2, 'Wrong status');
      expect(details._confirmRelays).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._eventDataSignatures).to.have.lengthOf(1, 'Wrong amount of signatures');
      expect(details._rejectRelays).to.have.lengthOf(requiredRejects.toNumber(), 'Wrong amount of rejects');
      expect(
        (await tonWrapper.getBalance(TonEvent.address)).toNumber() / 10**9
      ).to.be.greaterThan(0, 'Too low balance')
        .to.be.lessThan(0.5, 'Too high balance');
    });
  });
});
