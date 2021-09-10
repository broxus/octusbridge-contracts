const BigNumber = require("bignumber.js");
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
  getTokenWalletByAddress,
  extractTonEventAddress,
} = require('../../utils');


describe('Test ton event confirm', async function() {
  this.timeout(10000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let tonEventConfiguration, proxy, initializer;
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
        logger.log(`[Balance change] ${contract} ${locklift.utils.convertCrystal(balanceDiff, 'ton').toFixed(9)} TON`);
      }
    }
  });

  it('Setup bridge', async () => {
    relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  
    [tonEventConfiguration, proxy, initializer] = await setupTonEventConfiguration(
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
  
  let eventContract, tonEventParams, tonEventValue, burnPayload;
  
  describe('Initialize event', async () => {
    tonEventValue = 444;
    tonEventParams = {
      ethereumAddress: 222,
      chainId: 333
    }

    it('Setup event data', async () => {
      initializerTokenWallet = await getTokenWalletByAddress(initializer.address, await proxy.call({method: 'getTokenRoot'}));
      initializerTokenWallet.name = 'Initializer TokenWallet'
      burnPayload = await cellEncoder.call({
        method: 'encodeBurnPayload',
        params: tonEventParams
      });
    });
  
    it('Initialize event', async () => {
      const tx = await initializer.runTarget({
        contract: initializerTokenWallet,
        method: 'burnByOwner',
        params: {
          tokens: tonEventValue,
          grams: 0,
          send_gas_to: initializer.address,
          callback_address: proxy.address,
          callback_payload: burnPayload
        },
        value: locklift.utils.convertCrystal(4, 'nano')
      });
      const expectedEventContract = await extractTonEventAddress(tx);

      logger.log(`Expected event address: ${expectedEventContract}`);
  
      eventContract = await locklift.factory.getContract('TokenTransferTonEvent');
      eventContract.setAddress(expectedEventContract);
      eventContract.afterRun = afterRun;
  
      metricManager.addContract(eventContract);
    });
  
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      expect(details._eventInitData.configuration)
        .to.be.equal(tonEventConfiguration.address, 'Wrong event configuration');
      
      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');

      expect(details._signatures)
        .to.have.lengthOf(0, 'Wrong amount of signatures');

      expect(details._rejects)
        .to.have.lengthOf(0, 'Wrong amount of rejects');
  
      expect(details._initializer)
        .to.be.equal(proxy.address, 'Wrong initializer');
    });
  
    it('Check event round relays', async () => {
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

    it('Check encoded event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });

      expect(data.rootToken)
        .to.be.equal(await proxy.call({method: 'getTokenRoot'}), 'Wrong root token');

      expect(data.owner_address)
        .to.be.equal(initializer.address, 'Wrong owner address');

      expect(data.wid)
        .to.be.bignumber.equal(initializer.address.split(':')[0], 'Wrong wid');

      expect(data.addr)
        .to.be.bignumber.equal(new BigNumber(initializer.address.split(':')[1], 16), 'Wrong address');

      expect(data.tokens)
        .to.be.bignumber.equal(tonEventValue, 'Wrong amount of tokens');

      expect(data.ethereum_address)
        .to.be.bignumber.equal(tonEventParams.ethereumAddress, 'Wrong ethereum address');

      expect(data.chainId)
        .to.be.bignumber.equal(tonEventParams.chainId, 'Wrong chain id');
    });
  });
  
  describe('Confirm event', async () => {
    it('Confirm event enough times', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
      const confirmations = [];
      for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
        logger.log(`Confirm #${relayId} from ${relay.public}`);

        confirmations.push(eventContract.run({
          method: 'confirm',
          params: {
            signature: Buffer
              .from(`0x${'ff'.repeat(65)}`)
              .toString('hex'), // 132 symbols
          },
          keyPair: relay
        }));
      }
      await Promise.all(confirmations);
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
        .to.be.bignumber.equal(2, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');

      expect(details._signatures)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of signatures');

      expect(details._rejects)
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
        .to.be.bignumber.equal(2, 'Wrong status');
  
      expect(details._confirms)
        .to.have.lengthOf(relays.length, 'Wrong amount of relays confirmations');
  
      expect(details._signatures)
        .to.have.lengthOf(relays.length, 'Wrong amount of signatures');
  
      expect(details._rejects)
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
