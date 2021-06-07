const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
  logContract,
  enableEventConfiguration,
  logger,
  expect,
} = require('./utils');


describe('Test ethereum event reject', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let ethereumEventConfiguration, proxy;
  let relays;
  
  it('Setup bridge', async () => {
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge();
  
    [ethereumEventConfiguration, proxy] = await setupEthereumEventConfiguration(
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
        ethereumEventConfiguration,
        'ethereum'
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
        .to.be.equal(ethereumEventConfiguration.address, 'Wrong configuration address');
      
      expect(activeConfigurations._types[0])
        .to.be.bignumber.equal(0, 'Wrong configuration type');
    });
  });
  
  describe('Reject event', async () => {
    let eventContract, eventConfirmParams;
  
    const eventDataStructure = {
      tokens: 100,
      wid: 0,
      owner_addr: 111,
      owner_pubkey: 222,
    };

    it('Setup event data', async () => {
      const eventData = await cellEncoder.call({
        method: 'encodeEthereumEventData',
        params: eventDataStructure
      });

      eventConfirmParams = {
        eventVoteData: {
          eventTransaction: 111,
          eventIndex: 222,
          eventData,
          eventBlockNumber: 333,
          eventBlock: 444,
          round: 555,
        },
        configurationID: 1,
      };
    });

    it('Initialize event', async () => {
      const tx = await relays[0].runTarget({
        contract: bridge,
        method: 'confirmEthereumEvent',
        params: eventConfirmParams,
        value: locklift.utils.convertCrystal(1, 'nano')
      });

      logger.log(`Event initialization tx: ${tx.transaction.id}`);

      const expectedEventAddress = await ethereumEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData: eventConfirmParams.eventVoteData,
        }
      });

      logger.log(`Expected event address: ${expectedEventAddress}`);

      eventContract = await locklift.factory.getContract('EthereumEvent');
      eventContract.setAddress(expectedEventAddress);
    });
  
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
    
      expect(details._initData.eventTransaction)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventTransaction, 'Wrong event transaction');
    
      expect(details._initData.eventIndex)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventIndex, 'Wrong event index');
    
      expect(details._initData.eventData)
        .to.be.equal(eventConfirmParams.eventVoteData.eventData, 'Wrong event data');
    
      expect(details._initData.eventBlockNumber)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventBlockNumber, 'Wrong event block number');
    
      expect(details._initData.eventBlock)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.eventBlock, 'Wrong event block');
    
      expect(details._initData.round)
        .to.be.bignumber.equal(eventConfirmParams.eventVoteData.round, 'Wrong event round');
    
      expect(details._initData.ethereumEventConfiguration)
        .to.be.equal(ethereumEventConfiguration.address, 'Wrong event configuration');
    
      expect(details._initData.requiredConfirmations)
        .to.be.bignumber.equal(2, 'Wrong required confirmations');
    
      expect(details._initData.requiredRejects)
        .to.be.bignumber.equal(2, 'Wrong required rejects');
    
      expect(details._initData.proxyAddress)
        .to.be.equal(proxy.address, 'Wrong proxy');
    
      expect(details._status)
        .to.be.bignumber.equal(0, 'Wrong status');
    
      expect(details.confirms)
        .to.have.lengthOf(1, 'Wrong amount of relays confirmations');
    
      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    
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
          method: 'rejectEthereumEvent',
          params: eventConfirmParams,
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
        .to.be.bignumber.equal(3, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(1, 'Wrong amount of confirmations');
      
      expect(details.rejects)
        .to.have.lengthOf(2, 'Wrong amount of rejects');
    });
  });
  
  after(async () => {
    await logContract(bridgeOwner);
    await logContract(bridge);
    await logContract(staking);
    await logContract(ethereumEventConfiguration);
    
    for (const relay of relays) {
      await logContract(relay);
    }
  });
});
