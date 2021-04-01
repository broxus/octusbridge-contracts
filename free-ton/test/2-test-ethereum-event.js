const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');

const utils = require('./utils');


let Bridge;
let CellEncoder;
let EthereumEventConfiguration;
let EthereumEvent;
let EventProxySimple;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
  messageExpirationTimeout: 240000,
  waitForTimeout: 60000,
  // debug: Boolean(process.env.TON_WRAPPER_DEBUG),
});

const relaysManager = new utils.RelaysManager(
  parseInt(process.env.RELAYS_AMOUNT),
  tonWrapper,
);


describe('Test Ethereum event', async function() {
  this.timeout(12000000);
  
  before(async function() {
    await tonWrapper.setup();
    await relaysManager.setup();
    
    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
    
    EthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await EthereumEventConfiguration.loadMigration('valid');
  
    EventProxySimple = await freeton.requireContract(tonWrapper, 'EventProxySimple');
    await EventProxySimple.loadMigration();
  
    CellEncoder = await freeton
      .requireContract(tonWrapper, 'CellEncoder');
    await CellEncoder.loadMigration();
  
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`Ethereum event configuration address: ${EthereumEventConfiguration.address}`);
    logger.log(`Ethereum Proxy address: ${EventProxySimple.address}`);
  });
  
  describe('Confirm event', async function() {
    const eventDataStructure = {
      tokens: 123,
      wid: 0,
      owner_addr: freeton.utils.getRandomNonce(),
      owner_pubkey: 333,
    };

    it('Initialize event', async function() {
      const eventData = await CellEncoder.runLocal('encodeEthereumEventData', eventDataStructure);
      
      logger.log(`Encoded event data: ${eventData}`);
      
      eventParams = {
        eventVoteData: {
          eventTransaction: 1,
          eventIndex: 1,
          eventData,
          eventBlockNumber: 1,
          eventBlock: 1,
        },
        configurationID: 111
      };
  
      await relaysManager.runTarget({
        contract: Bridge,
        method: 'confirmEthereumEvent',
        input: eventParams,
      }).catch(e => console.log(e));
      
      const {
        value: {
          addr: ethereumEventAddress,
        }
      } = (await EthereumEventConfiguration.getEvents('EventConfirmation')).pop();

      logger.log(`Event address: ${ethereumEventAddress}`);

      EthereumEvent = await freeton.requireContract(
        tonWrapper,
        'EthereumEvent',
        ethereumEventAddress
      );
    });
    
    it('Check event details', async function() {
      const details = await EthereumEvent.runLocal('getDetails', {});
      const eventData = await CellEncoder.runLocal('encodeEthereumEventData', eventDataStructure);
  
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransaction, 'Wrong event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventIndex, 'Wrong event index');
      expect(details._initData.eventBlockNumber.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventBlockNumber, 'Wrong block number');
      expect(details._initData.eventBlock.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventBlock, 'Wrong block');
      expect(details._initData.eventData)
        .to
        .equal(eventData, 'Wrong event data');
      
      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status');
      expect(details._confirmRelays)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
    });
    
    it('Check event decoded data', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
  
      expect(decodedData.rootToken)
        .to
        .equal(
          relaysManager.accounts[0].address,
          'Wrong root token in configuration meta'
        );
      expect(decodedData.tokens.toNumber())
        .to
        .equal(eventDataStructure.tokens, 'Wrong event data decoding - tokens');
      expect(decodedData.wid.toNumber())
        .to
        .equal(eventDataStructure.wid, 'Wrong event data decoding - wid');
      expect(decodedData.owner_addr.toNumber())
        .to
        .equal(eventDataStructure.owner_addr, 'Wrong event data decoding - owner_addr:');
      expect(decodedData.owner_pubkey.toNumber())
        .to
        .equal(eventDataStructure.owner_pubkey, 'Wrong event data decoding - owner_pubkey:');
    });
    
    it('Check owner address received message on event creation', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
  
      expect(incomingMessages)
        .to
        .have.length(1, 'Event address should receive notification on event creation');
    });
    
    // it('Try to confirm event with non-relay key', async function() {
      // const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
      //
      // await freeton.utils.catchRunFail(
      //   Bridge.run('confirmEthereumEvent', eventParams, arbitraryKeyPair),
      //   5001
      // );
    // });
    
    it('Confirm event enough times', async function() {
      const {
        _initData: {
          requiredConfirmations,
        }
      } = await EthereumEvent.runLocal('getDetails');

      for (const keyId of _.range(1, requiredConfirmations.toNumber())) {
        const tx = await relaysManager.runTarget({
          contract: Bridge,
          method: 'confirmEthereumEvent',
          input: eventParams,
        }, keyId);
        
        logger.log(`Confirm transaction #${keyId}: ${tx.transaction.id}`);
      }
    });
    
    it('Check ethereum event confirmed', async function() {
      const details = await EthereumEvent.runLocal('getDetails', {});
  
      const {
        _initData: {
          requiredConfirmations,
        }
      } = await EthereumEvent.runLocal('getDetails');
  
      expect(details._confirmRelays)
        .to
        .have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
  
      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects');
  
      expect(details._status.toNumber())
        .to
        .equal(1, 'Wrong proxy callback executed status');
    });
    
    it('Check ethereum event balance is zero', async function() {
      expect((await tonWrapper.getBalance(EthereumEvent.address)).toNumber())
        .to
        .equal(0, 'Event contract balance should be 0 after confirmation');
    });
    
    it('Check proxy received notification', async function() {
      const proxyDetails = await EventProxySimple.runLocal('getDetails', {});
  
      expect(proxyDetails._callbackCounter.toNumber())
        .to
        .equal(0, 'Proxy should not receive callback');
    });
    
    it('Check owner address received message on event confirmation', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
  
      expect(incomingMessages)
        .to
        .have.length(2, 'Event address should receive notification on event confirmation');
    });
    
    it('Execute event callback', async function() {
      await relaysManager.runTarget({
        contract: EthereumEvent,
        method: 'executeProxyCallback',
        input: {}
      });
      
      const proxyDetails = await EventProxySimple.runLocal('getDetails', {});
  
      expect(proxyDetails._callbackCounter.toNumber())
        .to
        .equal(1, 'Proxy should receive callback');
      expect(proxyDetails._ethereumEventConfiguration)
        .to
        .equal(EthereumEventConfiguration.address, 'Wrong Proxy event configuration address');
      
      const details = await EthereumEvent.runLocal('getDetails', {});
  
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(proxyDetails._eventData.eventTransaction.toNumber(), 'Wrong Proxy event transaction');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(proxyDetails._eventData.eventIndex.toNumber(), 'Wrong Proxy event index');
      expect(details._initData.eventBlockNumber.toNumber())
        .to
        .equal(proxyDetails._eventData.eventBlockNumber.toNumber(), 'Wrong Proxy block number');
      expect(details._initData.eventBlock.toNumber())
        .to
        .equal(proxyDetails._eventData.eventBlock.toNumber(), 'Wrong Proxy block');
    });
    
    it('Check owner address received message on event execution', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
  
      expect(incomingMessages)
        .to
        .have.length(3, 'Owner address should receive notification on event execution');
    });
  });
  
  describe('Reject event', async function() {
    const eventDataStructure = {
      tokens: 123,
      wid: 0,
      owner_addr: freeton.utils.getRandomNonce(),
      owner_pubkey: 333,
    };

    it('Initialize event', async function() {
      const eventData = await CellEncoder.runLocal('encodeEthereumEventData', eventDataStructure);

      eventParams = {
        eventVoteData: {
          eventTransaction: 2, // here's the difference with previously confirmed event
          eventIndex: 1,
          eventData,
          eventBlockNumber: 1,
          eventBlock: 1,
        },
        configurationID: 111
      };

      await relaysManager.runTarget({
        contract: Bridge,
        method: 'confirmEthereumEvent',
        input: eventParams,
      });

      const {
        value: {
          addr: ethereumEventAddress,
        }
      } = (await EthereumEventConfiguration.getEvents('EventConfirmation')).pop();

      logger.log(`Event address: ${ethereumEventAddress}`);

      EthereumEvent = await freeton.requireContract(
        tonWrapper,
        'EthereumEvent',
        ethereumEventAddress
      );
    });
    
    it('Check event details', async function() {
      const details = await EthereumEvent.runLocal('getDetails', {});
  
      expect(details._initData.eventTransaction.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventTransaction, 'Wrong event transaction in ton event');
      expect(details._initData.eventIndex.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventIndex, 'Wrong event index in ton event');
      expect(details._initData.eventBlockNumber.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventBlockNumber, 'Wrong block number in ton event');
      expect(details._initData.eventBlock.toNumber())
        .to
        .equal(eventParams.eventVoteData.eventBlock, 'Wrong block in ton event');
  
      expect(details._status.toNumber())
        .to
        .equal(0, 'Wrong status for new ton event');
      expect(details._confirmRelays)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations for new ton event');
      expect(details._rejectRelays)
        .to
        .have.lengthOf(0, 'Wrong amount of rejects for new ton event');
    });
  
    it('Check owner address received message on event creation', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils.getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(1, 'Event address should receive notification on event creation');
    });
  
    it('Try to reject event with non-relay key', async function() {
      // const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
      //
      // await freeton.utils.catchRunFail(
      //   Bridge.run('rejectEthereumEvent', eventParams, arbitraryKeyPair),
      //   5001
      // );
    });

    it('Reject event enough times', async function() {
      const {
        _initData: {
          requiredRejects,
        }
      } = await EthereumEvent.runLocal('getDetails');

      for (const keyId of _.range(1, requiredRejects.toNumber() + 1)) {
        const tx = await relaysManager.runTarget({
          contract: Bridge,
          method: 'rejectEthereumEvent',
          input: eventParams,
        }, keyId);
        
        logger.log(`Reject transaction #${keyId}: ${tx.transaction.id}`);
      }
    });
  
    it('Check ethereum event rejected', async function() {
      const {
        _initData: {
          requiredRejects,
        }
      } = await EthereumEvent.runLocal('getDetails');

      const details = await EthereumEvent.runLocal('getDetails', {});
  
      expect(details._confirmRelays)
        .to
        .have.lengthOf(1, 'Wrong amount of confirmations in rejected ton event');
      expect(details._rejectRelays)
        .to
        .have.lengthOf(requiredRejects.toNumber(), 'Wrong amount of rejects in rejected ton event');
      expect(details._status.toNumber())
        .to
        .equal(3, 'Wrong status for rejected ton event');
    });
  
    it('Check ethereum event balance is zero after rejection', async function() {
      expect((await tonWrapper.getBalance(EthereumEvent.address)).toNumber())
        .to
        .equal(0, 'Non-empty balance for rejected ton event');
    });
  
    it('Check owner address received message on event rejection', async function() {
      const decodedData = await EthereumEvent.runLocal('getDecodedData', {});
      const incomingMessages = await utils
        .getMessagesByDestination(tonWrapper, decodedData.owner_address);
    
      expect(incomingMessages)
        .to
        .have.length(2, 'Event address should receive notification on event rejection');
    });
  });
});
