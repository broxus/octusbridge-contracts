const {
  setupBridge,
  setupTonEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  afterRun,
  logger,
  expect,
} = require('./utils');


describe('Test ton event confirm', async function() {
  this.timeout(10000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let tonEventConfiguration, initializer;
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
  
    [tonEventConfiguration, initializer] = await setupTonEventConfiguration(
      bridgeOwner,
      staking,
      cellEncoder,
    );
  
    metricManager = new MetricManager(
      bridge, bridgeOwner, staking,
      tonEventConfiguration, initializer
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
  
    it('Check configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);
    
      expect(configurations['0'])
        .to.be.not.equal(undefined, 'Configuration not found');
    
      expect(configurations['0']._eventConfiguration)
        .to.be.equal(tonEventConfiguration.address, 'Wrong configuration address');
    
      expect(configurations['0']._enabled)
        .to.be.equal(true, 'Wrong connector status');
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
      eventContract.afterRun = afterRun;
  
      metricManager.addContract(eventContract);
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
    
      expect(requiredVotes)
        .to.be.bignumber.greaterThan(0, 'Too low required votes for event');
    
      expect(relays.length)
        .to.be.bignumber.greaterThanOrEqual(requiredVotes.toNumber(), 'Too many required votes for event');
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
  
      for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
        logger.log(`Confirm #${relayId} from ${relay.public}`);

        await eventContract.run({
          method: 'confirm',
          params: {
            signature: Buffer
              .from(`0x${'ff'.repeat(65)}`)
              .toString('hex'), // 132 symbols
          },
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
        .to.be.bignumber.greaterThan(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details.confirms)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');

      expect(details._signatures)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of signatures');

      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    });
    
    it('Send confirms from the rest of relays', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
      
      for (const [relayId, relay] of Object.entries(relays.slice(requiredVotes))) {
        logger.log(`Confirm #${requiredVotes.plus(relayId)} from ${relay.public}`);
    
        await eventContract.run({
          method: 'confirm',
          params: {
            signature: Buffer
              .from(`0x${'ff'.repeat(65)}`)
              .toString('hex'), // 132 symbols
          },
          keyPair: relay
        });
      }
    });
    
    it('Check event details after all relays voted', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
  
      expect(details.balance)
        .to.be.bignumber.greaterThan(0, 'Wrong balance');
  
      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');
  
      expect(details.confirms)
        .to.have.lengthOf(relays.length, 'Wrong amount of relays confirmations');
  
      expect(details._signatures)
        .to.have.lengthOf(relays.length, 'Wrong amount of signatures');
  
      expect(details.rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    });
    
    it('Close event', async () => {
      await initializer.runTarget({
        contract: eventContract,
        method: 'close',
        params: {},
        value: locklift.utils.convertCrystal(1, 'nano')
      });
  
      const details = await eventContract.call({
        method: 'getDetails'
      });
  
      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');
    });
  });
});
