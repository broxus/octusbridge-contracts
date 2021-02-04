const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');
const utils = require('./utils');


let Bridge;
let CellEncoder;
let TonEventConfiguration;
let TonEvent;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
  messageExpirationTimeout: 240000,
  waitForTimeout: 60000,
  debug: Boolean(process.env.TON_WRAPPER_DEBUG),
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

    CellEncoder = await freeton
      .requireContract(tonWrapper, 'CellEncoder');
    await CellEncoder.loadMigration();

    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`TON event configuration address: ${TonEventConfiguration.address}`);
  });

  describe('Confirm event', async function() {
    const eventDataStructure = {
      wid: 0,
      addr: freeton.utils.getRandomNonce(),
      tokens: 123,
      ethereum_address: freeton.utils.stringToBytesArray('123'),
    };

    it('Initialize event', async function() {
      const eventData = await CellEncoder.runLocal('encodeTonEventData', eventDataStructure);
  
      logger.log(`Encoded event data: ${eventData}`);
  
      eventParams = {
        eventVoteData: {
          eventTransaction: 1,
          eventIndex: 1,
          eventData,
          eventTransactionLt: 1,
          eventTimestamp: 1,
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
    });
    
    it('Check event details', async function() {
      const details = await TonEvent.runLocal('getDetails', {});
      const eventData = await CellEncoder.runLocal('encodeTonEventData', eventDataStructure);
  
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventIndex, 'Wrong event index');
      expect(details._initData.eventTransactionLt.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransactionLt, 'Wrong block number');
      expect(details._initData.eventData)
        .to
        .equal(eventData, 'Wrong event data');
  
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
    
    it('Check event decoded data', async function() {
      const decodedData = await TonEvent.runLocal('getDecodedData', {});

      expect(decodedData.rootToken)
        .to
        .equal(
          relaysManager.accounts[0].address,
          'Wrong root token in configuration meta'
        );
      expect(decodedData.wid.toNumber())
        .to
        .equal(eventDataStructure.wid, 'Wrong event data decoding - wid');
      expect(decodedData.addr.toNumber())
        .to
        .equal(eventDataStructure.addr, 'Wrong event data decoding - addr:');
      expect(decodedData.tokens.toNumber())
        .to
        .equal(eventDataStructure.tokens, 'Wrong event data decoding - tokens');

      // TODO: find out what's wrong with decoding ethereum_address
      // expect(decodedData.ethereum_address.toString())
      //   .to
      //   .equal(eventDataStructure.ethereum_address, 'Wrong event data decoding - ethereum_address');
    });
  
    it('Check owner address received message on event creation', async function() {
      const decodedData = await TonEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(1, 'Event address should receive notification on event creation');
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

      expect(details._status.toNumber())
        .to
        .equal(1, 'Wrong status');
      
      expect(details._confirmRelays)
        .to
        .have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      
      expect(details._eventDataSignatures)
        .to
        .have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');

      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');

      expect((await tonWrapper.getBalance(TonEvent.address)).toNumber())
        .to
        .equal(0, 'Non-empty event balance');
    });
  
    it('Check owner address received message on event confirmation', async function() {
      const decodedData = await TonEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(2, 'Event address should receive notification on event confirmation');
    });
  });

  describe('Reject event', async function() {
    const eventDataStructure = {
      wid: 0,
      addr: freeton.utils.getRandomNonce(),
      tokens: 123,
      ethereum_address: freeton.utils.stringToBytesArray('123'),
    };

    it('Initialize event', async function() {
      const eventData = await CellEncoder.runLocal('encodeTonEventData', eventDataStructure);

      eventParams = {
        eventVoteData: {
          eventTransaction: 2, // difference with the previous one event
          eventIndex: 1,
          eventData,
          eventTransactionLt: 1,
          eventTimestamp: 1,
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
    });
    
    it('Check event details', async function() {
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
  
    it('Check owner address received message on event creation', async function() {
      const decodedData = await TonEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(1, 'Event address should receive notification on event creation');
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
  
      // No need for signature on TON event rejection
      delete eventParams.eventDataSignature;
  
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
      expect((await tonWrapper.getBalance(TonEvent.address)).toNumber()).to.equal(0, 'Non-empty event balance');
    });
  
    it('Check owner address received message on event rejection', async function() {
      const decodedData = await TonEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(2, 'Event address should receive notification on event rejection');
    });
  });
});
