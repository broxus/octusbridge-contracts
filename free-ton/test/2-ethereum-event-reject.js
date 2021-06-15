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
  let ethereumEventConfiguration, proxy, initializer;
  let relays;
  
  it('Setup bridge', async () => {
    relays = await setupRelays();
  
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  
    [ethereumEventConfiguration, proxy, initializer] = await setupEthereumEventConfiguration(
      bridgeOwner,
      staking,
      cellEncoder,
    );
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
  
  let eventContract, eventVoteData;
  
  describe('Initialize event', async () => {
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
  
      eventVoteData = {
        eventTransaction: 111,
          eventIndex: 222,
          eventData,
          eventBlockNumber: 333,
          eventBlock: 444,
          round: 555,
      };
    });
  
    it('Initialize event', async () => {
      const tx = await initializer.runTarget({
        contract: ethereumEventConfiguration,
        method: 'deployEvent',
        params: {
          eventVoteData,
        },
        value: locklift.utils.convertCrystal(3, 'nano')
      });
    
      logger.log(`Event initialization tx: ${tx.transaction.id}`);
  
      const expectedEventContract = await ethereumEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData,
        }
      });
    
      logger.log(`Expected event address: ${expectedEventContract}`);
    
      eventContract = await locklift.factory.getContract('EthereumEvent');
      eventContract.setAddress(expectedEventContract);
    });
  });
  
  describe('Reject event', async () => {
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
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });

      for (const relay of relays.slice(0, requiredVotes)) {
        logger.log(`Reject from ${relay.address}`);

        await relay.runTarget({
          contract: eventContract,
          method: 'reject',
          params: {},
          value: locklift.utils.convertCrystal(1, 'nano')
        });
      }
    });

    it('Check event rejected', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
  
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
  
      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(2, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');
  
      expect(details.rejects)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');
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
