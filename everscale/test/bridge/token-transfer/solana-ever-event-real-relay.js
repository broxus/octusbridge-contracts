const {
  setupBridge,
  setupSolanaEverscaleEventConfigurationReal,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  afterRun,
  logger,
  expect,
  getTokenWalletByAddress,
  getTokenRoot
} = require('../../utils');
const BigNumber = require("bignumber.js");


describe('Test solana everscale event real relay', async function() {
  this.timeout(10000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let solanaEverscaleEventConfiguration, everscaleSolanaEventConfiguration, stakingEverscaleSolanaEventConfiguration, proxy, initializer;
  let relays;
  let metricManager;
  let initializerTokenWallet;

  afterEach(async function() {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;
    
    const difference = await metricManager.getDifference(lastCheckPoint, currentName);
    
    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(`[Balance change] ${contract} ${locklift.utils.convertCrystal(balanceDiff, 'ton').toFixed(9)} Everscale`);
      }
    }
  });

  it('Setup bridge', async () => {
    relays = [{
      "public": "16cc3e34e53f6618bd7e054c124542983004c0021bb01c131cabdb2c933b1ece"
    }];

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaEverscaleEventConfiguration, everscaleSolanaEventConfiguration, stakingEverscaleSolanaEventConfiguration, proxy, initializer] = await setupSolanaEverscaleEventConfigurationReal(
      bridgeOwner,
      staking
    );

    initializerTokenWallet = await getTokenWalletByAddress(initializer.address, await proxy.call({method: 'getTokenRoot'}));
    initializerTokenWallet.name = 'Initializer TokenWallet'

    metricManager = new MetricManager(
      bridge, bridgeOwner, staking,
      solanaEverscaleEventConfiguration, proxy, initializer
    );
  });
  
  describe('Enable events configuration', async () => {
    it('Add sol event configuration to bridge', async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaEverscaleEventConfiguration,
      );
    });

    it('Check sol configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations['0'])
        .to.be.not.equal(undefined, 'Configuration not found');
      
      expect(configurations['0']._eventConfiguration)
        .to.be.equal(solanaEverscaleEventConfiguration.address, 'Wrong configuration address');
      
      expect(configurations['0']._enabled)
        .to.be.equal(true, 'Wrong connector status');
    });
    it('Add ever event configuration to bridge', async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleSolanaEventConfiguration,
      );
    });

    it('Check ever configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations['1'])
        .to.be.not.equal(undefined, 'Configuration not found');

      expect(configurations['1']._eventConfiguration)
        .to.be.equal(everscaleSolanaEventConfiguration.address, 'Wrong configuration address');

      expect(configurations['1']._enabled)
        .to.be.equal(true, 'Wrong connector status');
    });
  it('Add stacking event configuration to bridge', async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        stakingEverscaleSolanaEventConfiguration,
      );
    });

    it('Check stacking configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations['2'])
        .to.be.not.equal(undefined, 'Configuration not found');

      expect(configurations['2']._eventConfiguration)
        .to.be.equal(stakingEverscaleSolanaEventConfiguration.address, 'Wrong configuration address');

      expect(configurations['2']._enabled)
        .to.be.equal(true, 'Wrong connector status');
    });
  });

let eventContract, eventVoteData, eventDataStructure;
  
  describe('Initialize event', async () => {

    it('Setup event data', async () => {

      eventDataStructure = {
        sender_addr: new BigNumber('98776471968569566109529530756793112178692127562903192221493626843708983308791').toFixed(),
        tokens: 100,
        receiver_addr: '0:99f0fb098badc6ff5b974cb56b55e661f4a83dd4170a9b2be97766252e0a70e3'
      };

      const eventData = await cellEncoder.call({
        method: 'encodeSolanaEverscaleEventData',
        params: eventDataStructure
      });

      eventVoteData = {
        accountSeed: 111234567,
        slot: 0,
        blockTime: 0,
        txSignature: '',
        eventData,
      };
    });

    it('Initialize event', async () => {
      const tx = await initializer.runTarget({
        contract: solanaEverscaleEventConfiguration,
        method: 'deployEvent',
        params: {
          eventVoteData,
        },
        value: locklift.utils.convertCrystal(6, 'nano')
      });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract = await solanaEverscaleEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData,
        }
      });

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getContract('TokenTransferSolanaEverscaleEvent');
      eventContract.setAddress(expectedEventContract);
      eventContract.afterRun = afterRun;

      metricManager.addContract(eventContract);
    });

    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      expect(details._eventInitData.voteData.accountSeed)
        .to.be.bignumber.equal(eventVoteData.accountSeed, 'Wrong accountSeed');

      expect(details._eventInitData.voteData.eventData)
        .to.be.equal(eventVoteData.eventData, 'Wrong event data');

      expect(details._eventInitData.configuration)
        .to.be.equal(solanaEverscaleEventConfiguration.address, 'Wrong event configuration');

      expect(details._eventInitData.staking)
        .to.be.equal(staking.address, 'Wrong staking');

      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of relays confirmations');

      expect(details._rejects)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');

      expect(details._initializer)
        .to.be.equal(initializer.address, 'Wrong initializer');
    });

    it('Check event required votes', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });

      const relays = await eventContract.call({
        method: 'getVoters',
        params: {
          vote: 1
        }
      });

      expect(requiredVotes)
        .to.be.bignumber.greaterThan(0, 'Too low required votes for event');

      expect(relays.length)
        .to.be.bignumber.greaterThanOrEqual(requiredVotes.toNumber(), 'Too many required votes for event');
    });

    it('Check event round number', async () => {
      const roundNumber = await eventContract.call({ method: 'round_number' });
      
      expect(roundNumber)
        .to.be.bignumber.equal(0, 'Wrong round number');
    });
    
    it('Check encoded event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });

      expect(data.tokens)
        .to.be.bignumber.equal(eventDataStructure.tokens, 'Wrong amount of tokens');

      expect(data.receiver_addr)
        .to.be.equal(eventDataStructure.receiver_addr, 'Wrong receiver address');
    });
  });

});
