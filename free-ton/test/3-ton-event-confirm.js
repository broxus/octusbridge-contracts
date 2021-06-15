const {
  setupBridge,
  setupTonEventConfiguration,
  setupRelays,
  logContract,
  enableEventConfiguration,
  logger,
  expect,
} = require('./utils');


describe('Test ton event confirm', async function() {
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
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        tonEventConfiguration,
        'ton'
      );
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
  
  describe('Confirm event', async () => {
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
  
      const expectedeventEmitter = await tonEventConfiguration.call({
        method: 'deriveeventEmitter',
        params: {
          eventVoteData: eventConfirmParams.eventVoteData,
        }
      });
  
      logger.log(`Expected event address: ${expectedeventEmitter}`);
  
      eventContract = await locklift.factory.getContract('TonEvent');
      eventContract.setAddress(expectedeventEmitter);
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
  
    it('Check encoded event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });
    
      expect(data.rootToken)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong root token');
    
      expect(data.wid)
        .to.be.bignumber.equal(eventDataStructure.wid, 'Wrong wid');
    
      expect(data.addr)
        .to.be.bignumber.equal(eventDataStructure.addr, 'Wrong address');
    
      expect(data.tokens)
        .to.be.bignumber.equal(eventDataStructure.tokens, 'Wrong amount of tokens');
    
      expect(data.ethereum_address)
        .to.be.bignumber.equal(eventDataStructure.ethereum_address, 'Wrong ethereum address');
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
    //     .to.have.lengthOf(1, 'Wrong amount of relays rejects ');
    // });
    
    it('Confirm event enough times', async () => {
      const {
        _initData: {
          requiredConfirmations
        }
      } = await eventContract.call({
        method: 'getDetails'
      });

      for (const relay of relays.slice(1, requiredConfirmations)) {
        logger.log(`Confirmation from ${relay.address}`);

        await relay.runTarget({
          contract: bridge,
          method: 'confirmTonEvent',
          params: eventConfirmParams,
          value: locklift.utils.convertCrystal(1, 'nano')
        });
      }
    });

    it('Check event confirmed', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(2, 'Wrong amount of relays confirmations');
  
      expect(details._signatures)
        .to.have.lengthOf(2, 'Wrong amount of signatures');
  
      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
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
