const {
  setupBridge,
  setupTonEventConfiguration,
  setupRelays,
  logContract,
  logger,
} = require('./utils');

const chai = require('chai');
chai.use(require('chai-bignumber')());

const { expect } = chai;


describe('Test ton event reject', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let tonEventConfiguration;
  let relays;
  
  it('Setup bridge', async () => {
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge();
    
    [tonEventConfiguration] = await setupTonEventConfiguration(
      bridgeOwner,
      bridge,
      cellEncoder,
    );
    
    relays = await setupRelays();
  });
  
  describe('Enable event configuration', async () => {
    it('Add event configuration to bridge', async () => {
      await bridgeOwner.runTarget({
        contract: bridge,
        method: 'createEventConfiguration',
        params: {
          id: 1,
          eventConfiguration: {
            addr: tonEventConfiguration.address,
            status: true,
            _type: 1
          }
        }
      });
    });
    
    it('Check active configurations', async () => {
      const activeConfigurations = await bridge.call({
        method: 'getActiveEventConfigurations',
      });
      
      expect(activeConfigurations.ids)
        .to.have.lengthOf(1, 'Wrong amount of active configurations');
      
      expect(activeConfigurations.ids[0])
        .to.be.bignumber.equal(1, 'Wrong configuration id');
      
      expect(activeConfigurations.addrs[0])
        .to.be.equal(tonEventConfiguration.address, 'Wrong configuration address');
      
      expect(activeConfigurations._types[0])
        .to.be.bignumber.equal(1, 'Wrong configuration type');
    });
  });
  
  describe('Reject event', async () => {
    let eventContract, eventConfirmParams;
    
    const eventDataStructure = {
      wid: 0,
      addr: 111,
      tokens: 100,
      ethereum_address: 222,
    };
    
    it('Setup event data', async () => {
      const eventData = await cellEncoder.call({
        method: 'encodeTonEventData',
        params: eventDataStructure
      });
      
      eventConfirmParams = {
        eventVoteData: {
          eventTransaction: 111,
          eventTransactionLt: 222,
          eventTimestamp: 333,
          eventIndex: 444,
          eventData,
          round: 555,
        },
        eventDataSignature: '',
        configurationID: 1,
      };
    });
    
    it('Initialize event', async () => {
      const tx = await relays[0].runTarget({
        contract: bridge,
        method: 'confirmTonEvent',
        params: eventConfirmParams,
        value: locklift.utils.convertCrystal(1, 'nano')
      });
      
      logger.log(`Event initialization tx: ${tx.transaction.id}`);
      
      const expectedEventAddress = await tonEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData: eventConfirmParams.eventVoteData,
        }
      });
      
      logger.log(`Expected event address: ${expectedEventAddress}`);
      
      eventContract = await locklift.factory.getContract('TonEvent');
      eventContract.setAddress(expectedEventAddress);
    });
    
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      expect(details._initData.eventTransaction)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventTransaction, 'Wrong event transaction');
      
      expect(details._initData.eventTransactionLt)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventTransactionLt, 'Wrong event transaction LT');
      
      expect(details._initData.eventTimestamp)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventTimestamp, 'Wrong event timestamp');
      
      expect(details._initData.eventIndex)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventIndex, 'Wrong event index');
      
      expect(details._initData.eventData)
        .to.be.equal(eventConfirmParams.eventVoteData.eventData, 'Wrong event data');
      
      expect(details._initData.round)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.round, 'Wrong event round');
      
      expect(details._initData.tonEventConfiguration)
        .to.be.equal(tonEventConfiguration.address, 'Wrong event configuration');
      
      expect(details._initData.requiredConfirmations)
        .to.be.bignumber.equal(2, 'Wrong required confirmations');
      
      expect(details._initData.requiredRejects)
        .to.be.bignumber.equal(2, 'Wrong required rejects');
      
      expect(details._status)
        .to.be.bignumber.equal(0, 'Wrong status');
      
      expect(details.confirms)
        .to.have.lengthOf(1, 'Wrong amount of confirmations');
      
      expect(details._signatures)
        .to.have.lengthOf(1, 'Wrong amount of signatures');
      
      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of rejects');
      
      expect(details.confirms)
        .to.include(relays[0].address,'Wrong relay initializer');
    });
    
    // it('Try to reuse key for confirm', async () => {
    //   await relays[0].runTarget({
    //     contract: bridge,
    //     method: 'confirmEthereumEvent',
    //     params: eventConfirmParams,
    //     value: locklift.utils.convertCrystal(1, 'nano')
    //   });
    //
    //   const details = await eventContract.call({
    //     method: 'getDetails'
    //   });
    //
    //   expect(details.confirms)
    //     .to.have.lengthOf(1, 'Wrong amount of rejects ');
    // });
    
    it('Reject event enough times', async () => {
      const {
        _initData: {
          requiredRejects
        }
      } = await eventContract.call({
        method: 'getDetails'
      });
      
      for (const relay of relays.slice(1, requiredRejects + 1)) {
        logger.log(`Rejection from ${relay.address}`);
        
        await relay.runTarget({
          contract: bridge,
          method: 'rejectTonEvent',
          params: {
            eventVoteData: eventConfirmParams.eventVoteData,
            configurationID: eventConfirmParams.configurationID
          },
          value: locklift.utils.convertCrystal(1, 'nano')
        });
      }
    });
    
    it('Check event rejected', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');
      
      expect(details._status)
        .to.be.bignumber.equal(2, 'Wrong status');
      
      expect(details.confirms)
        .to.have.lengthOf(1, 'Wrong amount of confirmations');
      
      expect(details._signatures)
        .to.have.lengthOf(1, 'Wrong amount of signatures');
      
      expect(details.rejects)
        .to.have.lengthOf(2, 'Wrong amount of rejects');
    });
  });
  
  after(async () => {
    await logContract(bridgeOwner);
    await logContract(bridge);
    await logContract(staking);
    await logContract(tonEventConfiguration);
    
    for (const relay of relays) {
      await logContract(relay);
    }
  });
});
