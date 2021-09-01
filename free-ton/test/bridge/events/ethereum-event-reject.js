const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  afterRun,
  logger,
  expect,
} = require('../../utils');


describe('Test ethereum event reject', async function() {
  this.timeout(10000000);
  
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
  
    it('Check configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);
    
      expect(configurations['0'])
        .to.be.not.equal(undefined, 'Configuration not found');
    
      expect(configurations['0']._eventConfiguration)
        .to.be.equal(ethereumEventConfiguration.address, 'Wrong configuration address');
    
      expect(configurations['0']._enabled)
        .to.be.equal(true, 'Wrong connector status');
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
      eventContract.afterRun = afterRun;
    });
  });
  
  describe('Reject event', async () => {
    it('Reject event enough times', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
  
      for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
        logger.log(`Reject #${relayId} from ${relay.public}`);

        await eventContract.run({
          method: 'reject',
          params: {},
          keyPair: relay
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
        .to.be.bignumber.equal(3, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');
  
      expect(details._rejects)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');
    });
  });
});
