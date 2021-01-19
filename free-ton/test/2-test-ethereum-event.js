const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');

const utils = require('./utils');


let Bridge;
let EthereumEventConfiguration;
let EthereumEvent;
let EventProxySimple;
let eventParams;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
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
    
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`Ethereum event configuration address: ${EthereumEventConfiguration.address}`);
    logger.log(`Ethereum Proxy address: ${EventProxySimple.address}`);
  });
  
  describe('Confirm event', async function() {
    it('Initialize event', async function() {
      eventParams = {
        eventInitData: {
          eventTransaction: 1,
          eventIndex: 1,
          eventData: 'te6ccgEBAQEAIgAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEtaH',
          eventBlockNumber: 1,
          eventBlock: 1,
          ethereumEventConfiguration: EthereumEventConfiguration.address,
          requiredConfirmations: 0,
          requiredRejects: 0,
          proxyAddress: EthereumEventConfiguration.address,
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

      const details = await EthereumEvent.runLocal('getDetails', {});

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

      expect(details._status.toNumber()).to.equal(0, 'Wrong status');
      expect(details._confirmRelays).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');
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
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'confirmEthereumEvent',
          input: eventParams,
        }, keyId);
      }

      const details = await EthereumEvent.runLocal('getDetails', {});
      
      expect(details._confirmRelays).to.have.lengthOf(requiredConfirmations.toNumber(), 'Wrong amount of confirmations');
      expect(details._rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');
      expect(details._status.toNumber()).to.equal(1, 'Wrong proxy callback executed status');
      expect((await tonWrapper.getBalance(EthereumEvent.address)).toNumber()).to.be.greaterThan(0, 'Wrong balance');

      const proxyDetails = await EventProxySimple.runLocal('getDetails', {});
  
      expect(proxyDetails._callbackReceived)
        .to
        .equal(false, 'Proxy should not receive callback');
    });
    
    it('Execute event callback', async function() {
      await relaysManager.runTarget({
        contract: EthereumEvent,
        method: 'executeProxyCallback',
        input: {}
      });
      
      const proxyDetails = await EventProxySimple.runLocal('getDetails', {});

      expect(proxyDetails._callbackReceived)
        .to
        .equal(true, 'Proxy did not receive callback');
      expect(proxyDetails._state.toNumber())
        .to
        .equal(1234567, 'Wrong decoded event data');
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
          ethereumEventConfiguration: EthereumEventConfiguration.address,
          requiredConfirmations: 0,
          requiredRejects: 0,
          proxyAddress: EthereumEventConfiguration.address,
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

      const details = await EthereumEvent.runLocal('getDetails', {});

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

      expect(details._status.toNumber()).to.equal(0, 'Wrong status');
      expect(details._confirmRelays).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');
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
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'rejectEthereumEvent',
          input: eventParams,
        }, keyId);
      }

      const details = await EthereumEvent.runLocal('getDetails', {});

      expect(details._confirmRelays).to.have.lengthOf(1, 'Wrong amount of confirmations');
      expect(details._rejectRelays).to.have.lengthOf(requiredRejects.toNumber(), 'Wrong amount of rejects');
      expect(details._status.toNumber()).to.equal(3, 'Wrong status');
      expect(
        (await tonWrapper.getBalance(EthereumEvent.address)).toNumber() / 10 ** 9
      ).to.be.lessThan(0.1, 'Too many tons left')
        .to.be.greaterThan(0, 'Not enough balance to remain not-frozen');
    });
  });
});
