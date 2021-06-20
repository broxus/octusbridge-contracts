const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  logger,
  expect,
} = require('./utils');


describe('Test ethereum event confirm', async function() {
  this.timeout(1000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let ethereumEventConfiguration, proxy, initializer;
  let relays;
  let metricManager;
  
  afterEach(async function() {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;
    
    const difference = await metricManager.getDifference(lastCheckPoint, currentName);
    
    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(`[Balance change] ${contract} ${locklift.utils.convertCrystal(balanceDiff, 'ton').toFixed(9)} TON`);
      }
    }
  });

  it('Setup bridge', async () => {
    relays = await setupRelays();
    
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  
    [ethereumEventConfiguration, proxy, initializer] = await setupEthereumEventConfiguration(
      bridgeOwner,
      staking,
      cellEncoder,
    );
    
    metricManager = new MetricManager(
      bridge, bridgeOwner, staking,
      ethereumEventConfiguration, proxy, initializer
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

    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      expect(details._eventInitData.voteData.eventTransaction)
        .to.be.bignumber.equal(eventVoteData.eventTransaction, 'Wrong event transaction');

      expect(details._eventInitData.voteData.eventIndex)
        .to.be.bignumber.equal(eventVoteData.eventIndex, 'Wrong event index');

      expect(details._eventInitData.voteData.eventData)
        .to.be.equal(eventVoteData.eventData, 'Wrong event data');

      expect(details._eventInitData.voteData.eventBlockNumber)
        .to.be.bignumber.equal(eventVoteData.eventBlockNumber, 'Wrong event block number');

      expect(details._eventInitData.voteData.eventBlock)
        .to.be.bignumber.equal(eventVoteData.eventBlock, 'Wrong event block');

      expect(details._eventInitData.voteData.round)
        .to.be.bignumber.equal(eventVoteData.round, 'Wrong event round');

      expect(details._eventInitData.configuration)
        .to.be.equal(ethereumEventConfiguration.address, 'Wrong event configuration');
      
      expect(details._eventInitData.staking)
        .to.be.equal(staking.address, 'Wrong staking');
      
      expect(details._status)
        .to.be.bignumber.equal(0, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(0, 'Wrong amount of relays confirmations');

      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
   
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
      
      expect(requiredVotes)
        .to.be.bignumber.greaterThan(0, 'Too low required votes for event');
      
      expect(relays.length)
        .to.be.bignumber.greaterThanOrEqual(requiredVotes.toNumber(), 'Too many required votes for event');
    });

    it('Check encoded event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });

      expect(data.rootToken)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong root token');

      expect(data.tokens)
        .to.be.bignumber.equal(eventDataStructure.tokens, 'Wrong amount of tokens');

      expect(data.wid)
        .to.be.bignumber.equal(eventDataStructure.wid, 'Wrong wid');

      expect(data.owner_addr)
        .to.be.bignumber.equal(eventDataStructure.owner_addr, 'Wrong owner address');

      expect(data.owner_pubkey)
        .to.be.bignumber.equal(eventDataStructure.owner_pubkey, 'Wrong owner pubkey');
    });
  });
  
  describe('Confirm event', async () => {
    it('Confirm event enough times', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });

      for (const relay of relays.slice(0, requiredVotes)) {
        logger.log(`Confirm from ${relay.public}`);
        
        await eventContract.run({
          method: 'confirm',
          params: {},
          keyPair: relay
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

      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    });
  
    it('Check event proxy received callback', async () => {
      const details = await proxy.call({
        method: 'getDetails'
      });
      
      expect(details._callbackCounter)
        .to.be.bignumber.equal(1, 'Wrong callback counter');
    });
  });
});
