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
  let tonEventConfiguration, initializer;
  let relays;
  
  it('Setup bridge', async () => {
    relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  
    [tonEventConfiguration, initializer] = await setupTonEventConfiguration(
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
  
  let eventContract, eventVoteData;
  
  describe('Initialize event', async () => {
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

      eventVoteData = {
        eventTransaction: 111,
        eventTransactionLt: 222,
        eventTimestamp: 333,
        eventIndex: 444,
        eventData,
        round: 555,
      };
    });
  
    it('Initialize event', async () => {
      const tx = await initializer.runTarget({
        contract: tonEventConfiguration,
        method: 'deployEvent',
        params: {
          eventVoteData,
        },
        value: locklift.utils.convertCrystal(3, 'nano')
      });
  
      const expectedEventContract = await tonEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData,
        }
      });
  
      logger.log(`Expected event address: ${expectedEventContract}`);
  
      eventContract = await locklift.factory.getContract('TonEvent');
      eventContract.setAddress(expectedEventContract);
    });
  
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      expect(details._eventInitData.voteData.eventTransaction)
        .to.be.bignumber.equal(eventVoteData.eventTransaction, 'Wrong event transaction');

      expect(details._eventInitData.voteData.eventTransactionLt)
        .to.be.bignumber.equal(eventVoteData.eventTransactionLt, 'Wrong event transaction LT');

      expect(details._eventInitData.voteData.eventTimestamp)
        .to.be.bignumber.equal(eventVoteData.eventTimestamp, 'Wrong event timestamp');

      expect(details._eventInitData.voteData.eventIndex)
        .to.be.bignumber.equal(eventVoteData.eventIndex, 'Wrong event index');

      expect(details._eventInitData.voteData.eventData)
        .to.be.equal(eventVoteData.eventData, 'Wrong event data');

      expect(details._eventInitData.voteData.round)
        .to.be.bignumber.equal(eventVoteData.round, 'Wrong event round');

      expect(details._eventInitData.configuration)
        .to.be.equal(tonEventConfiguration.address, 'Wrong event configuration');
      
      expect(details._status)
        .to.be.bignumber.equal(0, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');

      expect(details._signatures)
        .to.have.lengthOf(0, 'Wrong amount of signatures');

      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of rejects');
  
      expect(details._initializer)
        .to.be.equal(initializer.address, 'Wrong initializer');
    });
  
    it('Check event round relays', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
    
      const relays = await eventContract.call({
        method: 'getVoters',
        params: {
          vote: 0
        }
      });
    
      // expect(requiredVotes)
      //   .to.be.bignumber.greaterThan(0, 'Too low required votes for event')
      //   .to.be.bignumber.lessThanOrEqual(relays.length, 'Too low relays for event');
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
  });
  
  describe('Confirm event', async () => {
    it('Confirm event enough times', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });

      for (const relay of relays.slice(0, requiredVotes)) {
        logger.log(`Confirm from ${relay.address}`);

        await relay.runTarget({
          contract: eventContract,
          method: 'confirm',
          params: {
            signature: '',
          },
          value: locklift.utils.convertCrystal(1, 'nano')
        });
      }
    });

    it('Check event confirmed', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
  
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
  
      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');

      expect(details._signatures)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of signatures');

      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    });
  });
  
  after(async () => {
    for (const relay of relays) {
      await logContract(relay);
    }

    await logContract(bridgeOwner);
    await logContract(bridge);
    await logContract(staking);
    await logContract(tonEventConfiguration);
    await logContract(initializer);
  });
});
